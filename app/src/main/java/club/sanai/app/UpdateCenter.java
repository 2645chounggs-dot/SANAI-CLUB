package club.sanai.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.webkit.WebView;

/** Updates are installed by Android from the official signed release, never by this app. */
final class UpdateCenter {
    private static final String RELEASES = "https://github.com/2645chounggs-dot/SANAI-CLUB/releases";
    private final Activity a;
    private final SharedPreferences p;
    UpdateCenter(Activity a, WebView w) {
        this.a=a;
        p=a.getSharedPreferences("sanai_update_v1",0);
        clearLegacyPatch();
        // Only delete the legacy cached installer, not user records or backup files.
        new java.io.File(a.getCacheDir(),"verified-release.apk").delete();
    }
    private void clearLegacyPatch(){
        p.edit().remove("patch").remove("patchMeta").remove("patchSig")
            .remove("pendingVersion").remove("pendingHash").apply();
    }
    void open(){
        if(a.isFinishing())return;
        new AlertDialog.Builder(a).setTitle("사나이 업데이트 센터 · V6.4.7")
            .setMessage("보안 강화를 위해 앱 내부 APK 설치와 OTA 코드 실행을 중단했습니다. 공식 GitHub 릴리스에서 서명된 APK를 확인하세요. 업데이트 전 기록을 백업하고, 보안 경고가 뜨면 설치하지 마세요.")
            .setPositiveButton("공식 릴리스 열기",(d,w)->{
                try{a.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(RELEASES)));}
                catch(Exception e){new AlertDialog.Builder(a).setMessage("브라우저를 열지 못했습니다.").setPositiveButton("확인",null).show();}
            }).setNegativeButton("닫기",null).show();
    }
    void safeMode(){clearLegacyPatch();}
    void onResume(){}
    void onPageReady(){}
}
