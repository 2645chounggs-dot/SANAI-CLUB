package club.sanai.app;
import android.app.*;
import android.content.*;
import android.os.*;
public class RestReceiver extends BroadcastReceiver {
    static PendingIntent intent(Context c){return PendingIntent.getBroadcast(c,53,new Intent(c,RestReceiver.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void schedule(Context c,long end){if(end<=System.currentTimeMillis())return;AlarmManager a=c.getSystemService(AlarmManager.class);try{a.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,end,intent(c));}catch(SecurityException e){a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,end,intent(c));}}
    static void cancel(Context c){c.getSystemService(AlarmManager.class).cancel(intent(c));}
    static void ensureChannel(Context c){NotificationManager n=c.getSystemService(NotificationManager.class);NotificationChannel ch=new NotificationChannel("sanai_rest","사나이크럽 휴식 알림",NotificationManager.IMPORTANCE_HIGH);ch.enableVibration(true);ch.setVibrationPattern(new long[]{0,350,150,350,150,600});n.createNotificationChannel(ch);}
    @Override public void onReceive(Context c,Intent i){WidgetState.refresh(c);ensureChannel(c);NotificationManager n=c.getSystemService(NotificationManager.class);PendingIntent open=PendingIntent.getActivity(c,54,new Intent(c,MainActivity.class).putExtra("widgetAction","rest"),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);Notification b=new Notification.Builder(c,"sanai_rest").setSmallIcon(R.drawable.icon).setLargeIcon(android.graphics.BitmapFactory.decodeResource(c.getResources(),R.drawable.chad_alert)).setContentTitle("전투 재개, BRO.").setContentText("휴식 종료. 다음 세트를 시작해라.").setContentIntent(open).setAutoCancel(true).build();try{n.notify(53,b);}catch(SecurityException ignored){}}
}
