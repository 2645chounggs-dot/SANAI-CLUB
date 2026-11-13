package club.sanai.app;
import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import org.json.*;
import java.time.*;
import java.util.*;

public class WidgetState {
    static final String PREF="sanai.widget.v1";
    static final Class<?>[] TYPES={NutritionWidget.class,WorkoutWidget.class,WeekWidget.class,RestWidget.class};
    static void accept(Context c,String raw){if(raw==null||raw.length()>200000)return;try{JSONObject j=new JSONObject(raw);if(j.optInt("schema")!=1)return;String prev=c.getSharedPreferences(PREF,0).getString("snapshot","");if(prev.equals(raw))return;c.getSharedPreferences(PREF,0).edit().putString("snapshot",raw).apply();refresh(c);schedule(c,j);}catch(JSONException ignored){}}
    static JSONObject read(Context c){try{return new JSONObject(c.getSharedPreferences(PREF,0).getString("snapshot","{}"));}catch(JSONException e){return new JSONObject();}}
    static void refresh(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);for(Class<?> type:TYPES){for(int id:m.getAppWidgetIds(new ComponentName(c,type)))render(c,m,id,type);}}
    static PendingIntent alarm(Context c){return PendingIntent.getBroadcast(c,5401,new Intent(c,WidgetRefresh.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void schedule(Context c,JSONObject j){AlarmManager am=c.getSystemService(AlarmManager.class);am.cancel(alarm(c));JSONObject t=j.optJSONObject("timer");if(t==null||!"running".equals(t.optString("mode")))return;long end=t.optLong("end");if(end<=System.currentTimeMillis())return;try{am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,end,alarm(c));}catch(SecurityException e){am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,end,alarm(c));}}
    static String f(double n){return String.format(Locale.KOREA,"%,.0f",n);}
    static PendingIntent tap(Context c,int id,String action){Intent i=new Intent(c,MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("widgetAction",action);i.setData(android.net.Uri.parse("sanai-widget://"+id+"/"+action));return PendingIntent.getActivity(c,id,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    static void render(Context c,AppWidgetManager m,int id,Class<?> type){
        JSONObject j=read(c);String today=LocalDate.now().toString();boolean synced=j.optInt("schema")==1;
        RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.widget_card);String title,main,detail,button,action;int progress=-1;long chrono=0;boolean active=false;
        if(type==NutritionWidget.class){title="영양 보급소";JSONObject n=j.optJSONObject("nutrition");boolean current=synced&&today.equals(j.optString("date"))&&n!=null;if(current){double p=n.optDouble("p",0),goal=n.optDouble("goal",0);main=f(p)+" / "+f(goal)+" g";detail=f(n.optDouble("kcal",0))+" kcal · 탄 "+f(n.optDouble("c",0))+"g · 지 "+f(n.optDouble("f",0))+"g";progress=goal>0?(int)Math.min(100,Math.max(0,100*p/goal)):0;button=p>=goal&&goal>0?"목표 정복, BRO.":"보급 기록  ›";}else{main="보급 데이터 갱신";detail="앱을 열어 오늘 기록을 불러와라.";button="보급소 열기  ›";}action="nutrition";
        }else if(type==WorkoutWidget.class){title="오늘의 전투";JSONObject w=j.optJSONObject("workout");if(synced&&today.equals(j.optString("date"))&&w!=null){String part=w.optString("part","");int total=w.optInt("total"),done=w.optInt("done"),logged=w.optInt("logged");main=part.isEmpty()?(logged>0?"훈련 기록 완료":"훈련 대기 중"):part;detail=total>0?done+" / "+total+"세트 · 기록 "+logged+"세트":logged+"세트 기록";progress=total>0?(int)Math.min(100,100.0*done/total):-1;button=total>0?"훈련 재개  ›":"훈련 개시  ›";}else{main="훈련 데이터 갱신";detail="앱을 열어 오늘 기록을 확인해라.";button="훈련 열기  ›";}action="edit";
        }else if(type==WeekWidget.class){title="사나이의 일주일";LocalDate now=LocalDate.now();LocalDate mon=now.minusDays(now.getDayOfWeek().getValue()-1);Set<String> days=new HashSet<>();JSONArray a=j.optJSONArray("days");if(a!=null)for(int k=0;k<a.length();k++)days.add(a.optString(k));int count=0;StringBuilder d=new StringBuilder();String[] labels={"월","화","수","목","금","토","일"};for(int k=0;k<7;k++){boolean hit=days.contains(mon.plusDays(k).toString());if(hit)count++;if(k>0)d.append("  ");d.append(labels[k]).append(hit?"✓":"·");}main=synced?"주간 "+count+"회":"주간 데이터 갱신";detail=synced?d.toString():"앱을 먼저 열어라, BRO.";button="훈련 달력  ›";action="calendar";
        }else{title="사나이의 휴식";JSONObject t=j.optJSONObject("timer");String mode=t==null?"idle":t.optString("mode");long end=t==null?0:t.optLong("end"),left=t==null?90000:t.optLong("remaining",90000);if("running".equals(mode)){left=Math.max(0,end-System.currentTimeMillis());if(left>0){active=true;chrono=SystemClock.elapsedRealtime()+left;}else mode="done";}if("done".equals(mode))left=0;long sec=(Math.max(0,left)+999)/1000;main=String.format(Locale.ROOT,"%02d:%02d",sec/60,sec%60);detail="done".equals(mode)?"전투 재개, BRO.":"paused".equals(mode)?"휴식 일시정지":"running".equals(mode)?"다음 세트를 준비해라.":"휴식 대기 중";button="running".equals(mode)?"일시정지  ›":"paused".equals(mode)?"휴식 재개  ›":"휴식 시작  ›";action="restToggle";}
        v.setTextViewText(R.id.title,title);v.setTextViewText(R.id.main,main);v.setTextViewText(R.id.detail,detail);v.setTextViewText(R.id.action,button);
        v.setViewVisibility(R.id.main,active?View.GONE:View.VISIBLE);v.setViewVisibility(R.id.clock,active?View.VISIBLE:View.GONE);v.setChronometer(R.id.clock,active?chrono:SystemClock.elapsedRealtime(),null,active);v.setChronometerCountDown(R.id.clock,true);
        v.setViewVisibility(R.id.progress,progress<0?View.GONE:View.VISIBLE);if(progress>=0)v.setProgressBar(R.id.progress,100,progress,false);
        v.setOnClickPendingIntent(R.id.root,tap(c,id,type==RestWidget.class?"rest":action));v.setOnClickPendingIntent(R.id.action,tap(c,id,action));m.updateAppWidget(id,v);
    }
}
