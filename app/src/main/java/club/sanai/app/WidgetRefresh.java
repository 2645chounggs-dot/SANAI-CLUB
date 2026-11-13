package club.sanai.app;
import android.content.*;
public class WidgetRefresh extends BroadcastReceiver { @Override public void onReceive(Context c,Intent i){WidgetState.refresh(c);} }
