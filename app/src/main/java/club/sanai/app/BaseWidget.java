package club.sanai.app;
import android.appwidget.*;import android.content.*;import android.os.Bundle;
public abstract class BaseWidget extends AppWidgetProvider {
 @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids)WidgetState.render(c,m,id,getClass());WidgetState.schedule(c,WidgetState.read(c));}
 @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options){WidgetState.render(c,m,id,getClass());}
}
