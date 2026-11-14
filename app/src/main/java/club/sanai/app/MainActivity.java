package club.sanai.app;
import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.*;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    static MainActivity foreground;
    private WebView web;
    private UpdateCenter updater;
    private ValueCallback<Uri[]> picker;
    private String backup, pendingAction;
    private boolean ready;
    private static final String HOME="file:///android_asset/index.html";
    @Override public void onCreate(Bundle b) {
        super.onCreate(b); RestReceiver.ensureChannel(this); getWindow().setStatusBarColor(0xff08090b); getWindow().setNavigationBarColor(0xff08090b);
        web=new WebView(this); updater=new UpdateCenter(this,web); WebSettings s=web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowContentAccess(true); s.setAllowFileAccess(true); s.setAllowFileAccessFromFileURLs(true); s.setAllowUniversalAccessFromFileURLs(true); s.setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new NativeBridge(),"SanaiNative");
        web.setWebViewClient(new WebViewClient(){
            private boolean external(String url) { if(url.startsWith("file:///android_asset/"))return false; if(url.startsWith("https://")||url.startsWith("http://")){try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(Exception ignored){}}return true; }
            @Override public boolean shouldOverrideUrlLoading(WebView v,String u){return external(u);}
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.isForMainFrame()||external(r.getUrl().toString());}
            @Override public void onPageFinished(WebView v,String url){if(HOME.equals(url)){ready=true;dispatch();sync();updater.onPageReady();}}
        });
        web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> cb,FileChooserParams p){if(picker!=null)picker.onReceiveValue(null);picker=cb;try{startActivityForResult(p.createIntent(),201);return true;}catch(Exception e){picker=null;cb.onReceiveValue(null);return false;}}});
        setContentView(web); accept(getIntent()); if(isRecovery(getIntent()))updater.safeMode(); web.loadUrl(HOME);
    }
    private boolean isRecovery(Intent i){return i!=null&&"club.sanai.app.UPDATE_RECOVERY".equals(i.getAction());}
    private void accept(Intent i){String a=i==null?null:i.getStringExtra("widgetAction");if(a!=null&&(a.equals("nutrition")||a.equals("edit")||a.equals("calendar")||a.equals("rest")||a.equals("restToggle")))pendingAction=a;}
    private void dispatch(){if(!ready||pendingAction==null)return;String a=pendingAction;pendingAction=null;web.evaluateJavascript("window.sanaiWidgetOpen && window.sanaiWidgetOpen('"+a+"')",null);}
    private void sync(){if(ready)web.evaluateJavascript("window.sanaiWidgetSync && window.sanaiWidgetSync()",null);}
    @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);if(isRecovery(i)){updater.safeMode();web.reload();}accept(i);dispatch();}
    @Override protected void onResume(){super.onResume();foreground=this;sync();if(updater!=null)updater.onResume();RestReceiver.presentPending(this);}
    @Override protected void onPause(){if(foreground==this)foreground=null;super.onPause();ChadAlert.activityPaused(this);}
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onActivityResult(int req,int res,Intent data){super.onActivityResult(req,res,data);if(req==201&&picker!=null){picker.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res,data));picker=null;}else if(req==202&&res==RESULT_OK&&data!=null&&data.getData()!=null&&backup!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out!=null)out.write(backup.getBytes(StandardCharsets.UTF_8));}catch(Exception ignored){}backup=null;}else if(req==202){backup=null;}}
    public class NativeBridge {
        @JavascriptInterface public void updateCenter(){runOnUiThread(()->updater.open());}
        @JavascriptInterface public void widgetSnapshot(String raw){WidgetState.accept(MainActivity.this,raw);}
        @JavascriptInterface public void schedule(long end){RestReceiver.schedule(MainActivity.this,end);}
        @JavascriptInterface public void restArm(long root,long end,boolean full,boolean background,boolean sound,boolean vibration){RestReceiver.arm(MainActivity.this,root,end,full,background,sound,vibration);}
        @JavascriptInterface public String restState(){return RestReceiver.state(MainActivity.this);}
        @JavascriptInterface public void restFinish(long root,long end){runOnUiThread(()->RestReceiver.finish(MainActivity.this,root,end));}
        @JavascriptInterface public boolean overlayEnabled(){return Settings.canDrawOverlays(MainActivity.this);}
        @JavascriptInterface public void overlaySettings(){runOnUiThread(()->{try{startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:"+getPackageName())));}catch(Exception ignored){startActivity(new Intent(Settings.ACTION_SETTINGS));}});}
        @JavascriptInterface public boolean exactAlarmEnabled(){return android.os.Build.VERSION.SDK_INT<31||getSystemService(AlarmManager.class).canScheduleExactAlarms();}
        @JavascriptInterface public void exactAlarmSettings(){runOnUiThread(()->{if(android.os.Build.VERSION.SDK_INT>=31){try{startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));}catch(Exception ignored){}}});}
        @JavascriptInterface public void cancel(){RestReceiver.cancel(MainActivity.this);}
        @JavascriptInterface public boolean notificationsEnabled(){return getSystemService(NotificationManager.class).areNotificationsEnabled();}
        @JavascriptInterface public void notificationSettings(){runOnUiThread(()->startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName())));}
        @JavascriptInterface public void exportBackup(String json,String filename){runOnUiThread(()->{backup=json;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,filename);startActivityForResult(i,202);});}
    }
}
