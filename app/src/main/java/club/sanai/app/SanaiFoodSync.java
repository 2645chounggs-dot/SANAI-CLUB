package club.sanai.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.WebView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.MGF1ParameterSpec;
import java.time.YearMonth;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import javax.crypto.spec.SecretKeySpec;

/**
 * Zero-cost, device-bound food sync. GitHub holds ONLY RSA-OAEP/AES-GCM encrypted
 * envelopes in public immutable files. The private RSA key never leaves the
 * Android Keystore, and neither diet logs nor OAuth/PAT credentials are uploaded.
 * This is an on-open/foreground sync; not an always-running background service.
 */
public final class SanaiFoodSync {
    private static final String REPO = "2645chounggs-dot/SANAI-CLUB";
    private static final String KEY_ALIAS = "sanai_food_sync_rsa_v1";
    private static final String PREF = "sanai.food.sync.v1";
    private static final long INTERVAL_MS = 30L * 60L * 1000L;
    private final Activity activity;
    private final WebView web;
    private final android.content.SharedPreferences prefs;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private boolean ready = false;
    private boolean foreground = false;
    private boolean polling = false;
    private final Runnable interval = new Runnable() {
        @Override public void run() {
            if (foreground && ready) {
                refresh();
                handler.postDelayed(this, INTERVAL_MS);
            }
        }
    };

    public SanaiFoodSync(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        this.prefs = activity.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public synchronized void onReady() {
        ready = true;
        if (foreground) refresh();
    }

    public synchronized void onResume() {
        foreground = true;
        handler.removeCallbacks(interval);
        if (ready) refresh();
        handler.postDelayed(interval, INTERVAL_MS);
    }

    public synchronized void onPause() {
        foreground = false;
        handler.removeCallbacks(interval);
    }

    private String deviceId() {
        String id = prefs.getString("deviceId", "");
        if (id.matches("[a-f0-9-]{36}")) return id;
        id = UUID.randomUUID().toString();
        prefs.edit().putString("deviceId", id).apply();
        return id;
    }

    private PublicKey publicKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (!ks.containsAlias(KEY_ALIAS)) {
            KeyPairGenerator generator = KeyPairGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_RSA, "AndroidKeyStore");
            generator.initialize(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                    KeyProperties.PURPOSE_DECRYPT)
                    .setKeySize(3072)
                    .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA1)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
                    .build());
            generator.generateKeyPair();
        }
        return ks.getCertificate(KEY_ALIAS).getPublicKey();
    }

    private String pem() throws Exception {
        String encoded = Base64.encodeToString(publicKey().getEncoded(), Base64.NO_WRAP);
        StringBuilder out = new StringBuilder("-----BEGIN PUBLIC KEY-----\n");
        for (int at = 0; at < encoded.length(); at += 64)
            out.append(encoded, at, Math.min(at + 64, encoded.length())).append('\n');
        return out.append("-----END PUBLIC KEY-----\n").toString();
    }

    public String info() {
        JSONObject result = new JSONObject();
        try {
            result.put("v", 1);
            result.put("repo", REPO);
            result.put("device_id", deviceId());
            result.put("public_key_pem", pem());
            result.put("paired", prefs.getBoolean("paired", false));
            result.put("last_sync", prefs.getString("last_sync", ""));
            result.put("last_error", prefs.getString("last_error", ""));
        } catch (Exception e) {
            try { result.put("error", "Android Keystore unavailable"); }
            catch (Exception ignored) {}
        }
        return result.toString();
    }

    public void copyPairing() {
        try {
            String payload = info();
            ClipboardManager clip = (ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
            clip.setPrimaryClip(ClipData.newPlainText("SANAI food sync public pairing key", payload));
        } catch (Exception ignored) {}
    }

    public void ack(String id) {
        if (id != null && id.matches("[a-f0-9-]{36}")) {
            prefs.edit().putBoolean("done:" + id, true).apply();
        }
    }

    private void status(String key, String value) {
        prefs.edit().putString(key, value).apply();
        handler.post(() -> web.evaluateJavascript(
                "window.sanaiFoodSyncStatusChanged && window.sanaiFoodSyncStatusChanged()", null));
    }

    public synchronized void refresh() {
        if (!ready || !foreground || polling) return;
        polling = true;
        io.execute(() -> {
            try { poll(); }
            catch (Exception e) {
                status("last_error", "동기화 실패: 네트워크 또는 암호화 설정 확인");
            } finally {
                synchronized (SanaiFoodSync.this) { polling = false; }
            }
        });
    }

    private void poll() throws Exception {
        final String id = deviceId();
        final String expected = pem().replaceAll("\\s+", "");
        final String publishedUrl =
                "https://raw.githubusercontent.com/" + REPO + "/main/sync/devices/" + id + ".pem";
        String published;
        try { published = get(publishedUrl, 7000, 12000); }
        catch (Exception unpaired) {
            prefs.edit().putBoolean("paired", false).apply();
            status("last_error", "최초 연결: 공개키를 ChatGPT에 등록해라");
            return;
        }
        if (!expected.equals(published.replaceAll("\\s+", ""))) {
            prefs.edit().putBoolean("paired", false).apply();
            status("last_error", "연결된 공개키가 이 휴대폰과 다름");
            return;
        }
        prefs.edit().putBoolean("paired", true).apply();
        String root = "https://api.github.com/repos/" + REPO + "/contents/sync/inbox?ref=main";
        JSONArray months = new JSONArray(get(root, 7000, 500000));
        YearMonth now = YearMonth.now();
        for (int m = 0; m < months.length(); m++) {
            JSONObject month = months.optJSONObject(m);
            if (month == null || !"dir".equals(month.optString("type"))) continue;
            String name = month.optString("name", "");
            if (!name.matches("20\\d\\d-(0[1-9]|1[0-2])")) continue;
            YearMonth ym;
            try { ym = YearMonth.parse(name); }
            catch (Exception ignored) { continue; }
            if (ym.isAfter(now.plusMonths(1)) || ym.isBefore(now.minusMonths(12))) continue;
            // Older months are scanned once to preserve API free-tier rate budget.
            if (ym.isBefore(now.minusMonths(1)) && prefs.getBoolean("scanned:" + name, false)) continue;
            JSONArray events = new JSONArray(get(
                    "https://api.github.com/repos/" + REPO + "/contents/sync/inbox/" + name + "?ref=main",
                    7000, 900000));
            for (int j = 0; j < events.length(); j++) {
                JSONObject item = events.optJSONObject(j);
                if (item == null || !"file".equals(item.optString("type"))) continue;
                String file = item.optString("name", "");
                if (!file.matches("[a-f0-9-]{36}\\.json")) continue;
                String eventId = file.substring(0, 36);
                if (prefs.getBoolean("done:" + eventId, false)) continue;
                String url = item.optString("download_url", "");
                String prefix = "https://raw.githubusercontent.com/" + REPO + "/main/sync/inbox/" + name + "/";
                if (!url.equals(prefix + file)) continue;
                String envelope = get(url, 7000, 75000);
                String payload = decrypt(envelope, eventId, id);
                if (payload != null) deliver(payload);
            }
            if (ym.isBefore(now.minusMonths(1)))
                prefs.edit().putBoolean("scanned:" + name, true).apply();
        }
        status("last_sync", java.time.OffsetDateTime.now().toString());
        status("last_error", "");
    }

    private String decrypt(String raw, String eventId, String deviceId) {
        try {
            JSONObject item = new JSONObject(raw);
            if (item.optInt("v") != 1 || !eventId.equals(item.optString("id"))
                    || !deviceId.equals(item.optString("device"))) return null;
            byte[] encryptedKey = Base64.decode(item.getString("wrapped_key"), Base64.DEFAULT);
            byte[] nonce = Base64.decode(item.getString("nonce"), Base64.DEFAULT);
            byte[] encrypted = Base64.decode(item.getString("ciphertext"), Base64.DEFAULT);
            if (encryptedKey.length != 384 || nonce.length != 12 || encrypted.length < 17
                    || encrypted.length > 32768) return null;
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            PrivateKey key = (PrivateKey) ks.getKey(KEY_ALIAS, null);
            if (key == null) return null;
            Cipher rsa = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
            rsa.init(Cipher.DECRYPT_MODE, key,
                    new OAEPParameterSpec("SHA-256", "MGF1",
                            MGF1ParameterSpec.SHA1, PSource.PSpecified.DEFAULT));
            byte[] aesKey = rsa.doFinal(encryptedKey);
            if (aesKey.length != 32) return null;
            Cipher aes = Cipher.getInstance("AES/GCM/NoPadding");
            aes.init(Cipher.DECRYPT_MODE, new SecretKeySpec(aesKey, "AES"),
                    new GCMParameterSpec(128, nonce));
            byte[] data = aes.doFinal(encrypted);
            JSONObject food = new JSONObject(new String(data, StandardCharsets.UTF_8));
            if (food.optInt("v") != 1 || !eventId.equals(food.optString("id"))) return null;
            return food.toString();
        } catch (Exception ignored) {
            return null; // Bad ciphertext, wrong device, old key: never import.
        }
    }

    private void deliver(String payload) {
        // JSON-quote the entire payload: no JS interpolation of untrusted food text.
        activity.runOnUiThread(() -> {
            if (!ready) return;
            web.evaluateJavascript("window.sanaiFoodSyncIngest && window.sanaiFoodSyncIngest("
                    + JSONObject.quote(payload) + ")", null);
        });
    }

    private static String get(String address, int timeout, int maxBytes) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(timeout);
        connection.setReadTimeout(timeout);
        connection.setRequestProperty("User-Agent", "SANAI-CLUB-food-sync/1");
        connection.setRequestProperty("Accept", "application/vnd.github+json");
        connection.setRequestProperty("Cache-Control", "no-cache");
        connection.setInstanceFollowRedirects(false);
        try {
            if (connection.getResponseCode() != 200) throw new java.io.IOException("HTTP failure");
            try (InputStream in = connection.getInputStream();
                    ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int n;
                while ((n = in.read(buffer)) >= 0) {
                    if (out.size() + n > maxBytes) throw new java.io.IOException("oversized response");
                    out.write(buffer, 0, n);
                }
                return out.toString("UTF-8");
            }
        } finally { connection.disconnect(); }
    }
}
