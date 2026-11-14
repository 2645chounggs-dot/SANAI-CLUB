package club.sanai.app;
import android.app.*;
import android.content.*;
import android.media.*;
import android.os.*;
import android.provider.Settings;
import org.json.*;

public class RestReceiver extends BroadcastReceiver {
    static final String PREF="sanai.rest.native.v59";
    static final Handler MAIN=new Handler(Looper.getMainLooper());
    static SharedPreferences prefs(Context c){return c.getSharedPreferences(PREF,0);}
    static PendingIntent intent(Context c){return PendingIntent.getBroadcast(c,53,new Intent(c,RestReceiver.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void alarm(Context c,long end,boolean enabled){
        AlarmManager a=c.getSystemService(AlarmManager.class);a.cancel(intent(c));
        if(!enabled||end<=System.currentTimeMillis())return;
        try{a.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,end,intent(c));}catch(SecurityException e){a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,end,intent(c));}
    }
    static boolean canBackground(Context c,boolean full,boolean background){return background||(full&&Settings.canDrawOverlays(c));}
    static synchronized void arm(Context c,long root,long end,boolean full,boolean background,boolean sound,boolean vibration){
        if(root<=0||end<=0)return;
        SharedPreferences p=prefs(c);long prior=p.getLong("root",0),current=p.getLong("end",0);
        if(prior==root&&current!=end)return; // native already finished or extended this timer
        if(prior!=root){
            p.edit().putLong("root",root).putLong("last",0).putString("action","running").apply();
            MAIN.post(()->{ChadAlert.dismiss();c.getSystemService(NotificationManager.class).cancel(53);});
        }
        p.edit().putLong("end",end).putBoolean("full",full).putBoolean("background",background).putBoolean("sound",sound).putBoolean("vibration",vibration).apply();
        alarm(c,end,canBackground(c,full,background));
    }
    static synchronized void schedule(Context c,long end){arm(c,end,end,true,true,true,true);}
    static synchronized void cancel(Context c){
        prefs(c).edit().clear().apply();alarm(c,0,false);
        MAIN.post(()->{ChadAlert.dismiss();c.getSystemService(NotificationManager.class).cancel(53);});
    }
    static synchronized String state(Context c){
        SharedPreferences p=prefs(c);JSONObject j=new JSONObject();
        try{j.put("root",p.getLong("root",0));j.put("end",p.getLong("end",0));j.put("last",p.getLong("last",0));j.put("action",p.getString("action",""));}catch(JSONException ignored){}
        return j.toString();
    }
    static void ensureChannel(Context c){NotificationManager n=c.getSystemService(NotificationManager.class);NotificationChannel ch=new NotificationChannel("sanai_rest","사나이크럽 휴식 알림",NotificationManager.IMPORTANCE_HIGH);ch.enableVibration(true);ch.setVibrationPattern(new long[]{0,350,150,350,150,600});n.createNotificationChannel(ch);}
    static void fallback(Context c){
        ensureChannel(c);NotificationManager n=c.getSystemService(NotificationManager.class);
        PendingIntent open=PendingIntent.getActivity(c,54,new Intent(c,MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("widgetAction","rest"),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        Notification b=new Notification.Builder(c,"sanai_rest").setSmallIcon(R.drawable.icon).setLargeIcon(android.graphics.BitmapFactory.decodeResource(c.getResources(),R.drawable.chad_alert)).setContentTitle("전투 재개, BRO.").setContentText("휴식 종료. 다음 세트를 시작해라.").setContentIntent(open).setAutoCancel(true).build();
        try{n.notify(53,b);}catch(SecurityException ignored){}
    }
    static void signal(Context c,SharedPreferences p){
        if(p.getBoolean("vibration",true)){try{Vibrator v=c.getSystemService(Vibrator.class);if(v!=null&&v.hasVibrator())v.vibrate(VibrationEffect.createWaveform(new long[]{0,350,150,350,150,600},-1),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());}catch(Exception ignored){}}
        if(p.getBoolean("sound",true)){try{AudioManager a=c.getSystemService(AudioManager.class);if(a.getRingerMode()==AudioManager.RINGER_MODE_NORMAL){ToneGenerator t=new ToneGenerator(AudioManager.STREAM_NOTIFICATION,70);t.startTone(ToneGenerator.TONE_PROP_ACK,300);MAIN.postDelayed(t::release,500);}}catch(Exception ignored){}}
    }
    static void updateWidget(Context c,long end){
        JSONObject snap=WidgetState.read(c);if(snap.optInt("schema")!=1){WidgetState.refresh(c);return;}
        try{JSONObject t=new JSONObject();t.put("mode",end>0?"running":"done");t.put("end",end);t.put("remaining",Math.max(0,end-System.currentTimeMillis()));snap.put("timer",t);WidgetState.accept(c,snap.toString());}catch(JSONException ignored){WidgetState.refresh(c);}
    }
    static boolean presentPending(Context c){
        SharedPreferences p=prefs(c);
        if(!p.getBoolean("full",true)||!"pending".equals(p.getString("action","")))return false;
        Activity a=MainActivity.foreground;
        if(a==null&&c.getSystemService(KeyguardManager.class).isKeyguardLocked())return false;
        if(ChadAlert.visible())return true;
        return ChadAlert.show(c,a);
    }
    static synchronized void finish(Context c,long root,long end){
        SharedPreferences p=prefs(c);
        if(root<=0||end<=0||p.getLong("root",0)!=root||p.getLong("end",0)!=end)return;
        if(end>System.currentTimeMillis()){alarm(c,end,canBackground(c,p.getBoolean("full",true),p.getBoolean("background",false)));return;}
        p.edit().putLong("end",0).putLong("last",end).putString("action","pending").apply();
        alarm(c,0,false);updateWidget(c,0);
        if(presentPending(c)){signal(c,p);}
        else if(p.getBoolean("background",false)||(p.getBoolean("full",true)&&Settings.canDrawOverlays(c)))fallback(c);
    }
    static synchronized void choose(Context c,boolean more){
        SharedPreferences p=prefs(c);
        if(!"pending".equals(p.getString("action",""))){ChadAlert.dismiss();return;}
        long next=more?System.currentTimeMillis()+30000:0;
        p.edit().putLong("end",next).putString("action",more?"extended":"dismissed").apply();
        ChadAlert.dismiss();c.getSystemService(NotificationManager.class).cancel(53);
        alarm(c,next,canBackground(c,p.getBoolean("full",true),p.getBoolean("background",false)));updateWidget(c,next);
    }
    @Override public void onReceive(Context c,Intent i){SharedPreferences p=prefs(c);finish(c,p.getLong("root",0),p.getLong("end",0));}
}
