package club.sanai.app;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.graphics.BitmapFactory;
import android.provider.Settings;
import android.view.*;
import android.widget.*;
import java.io.InputStream;

/** The selected artwork and fixed button artwork are separate layers. */
final class ChadAlert {
    private static Dialog dialog;
    private static Activity owner;
    private static WindowManager manager;
    private static ChadView overlay;
    static boolean visible(){return dialog!=null || overlay!=null;}
    static void dismiss(){
        Dialog d=dialog;dialog=null;owner=null;
        if(d!=null){try{d.dismiss();}catch(Exception ignored){}}
        ChadView v=overlay;WindowManager w=manager;overlay=null;manager=null;
        if(v!=null&&w!=null){try{w.removeViewImmediate(v);}catch(Exception ignored){}}
    }
    static boolean show(Context c, Activity activity){
        if(visible())return true;
        if(activity!=null&&!activity.isFinishing()&&!activity.isDestroyed()){
            try{
                Dialog d=new Dialog(activity,android.R.style.Theme_Material_NoActionBar_Fullscreen);
                d.setContentView(new ChadView(activity));
                d.setOnCancelListener(x->RestReceiver.choose(activity,false));
                dialog=d;owner=activity;
                d.show();
                Window w=d.getWindow();
                if(w!=null){
                    w.setLayout(-1,-1);
                    w.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN|WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
                }
                return true;
            }catch(Exception e){dismiss();}
        }
        if(!Settings.canDrawOverlays(c))return false;
        try{
            Context app=c.getApplicationContext();
            WindowManager w=app.getSystemService(WindowManager.class);
            ChadView v=new ChadView(app);
            WindowManager.LayoutParams lp=new WindowManager.LayoutParams(-1,-1,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN|WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,android.graphics.PixelFormat.OPAQUE);
            if(android.os.Build.VERSION.SDK_INT>=28)lp.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            lp.gravity=Gravity.TOP|Gravity.LEFT;
            manager=w;overlay=v;w.addView(v,lp);
            return true;
        }catch(Exception e){dismiss();return false;}
    }
    static void activityPaused(Activity a){
        if(dialog!=null&&owner==a){dismiss();RestReceiver.presentPending(a.getApplicationContext());}
    }
    private static final class ChadView extends ViewGroup {
        final FrameLayout artFrame;
        final ImageView art,controls;
        final Button start,extend;
        ValueAnimator shake;
        ChadView(Context c){
            super(c);setBackgroundColor(Color.BLACK);setClipChildren(true);
            artFrame=new FrameLayout(c);artFrame.setClipChildren(true);artFrame.setClipToPadding(true);
            art=image(c,"chad-art-v59.jpg");art.setContentDescription("휴식 종료! 일어나라, 사나이! 지금이 바로, 더 강해질 시간이다.");
            artFrame.addView(art,new FrameLayout.LayoutParams(-1,-1));addView(artFrame);
            controls=image(c,"chad-controls-v59.jpg");controls.setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);addView(controls);
            start=hit(c,"다음 세트 조지기",false);extend=hit(c,"30초 더 쉬기",true);
            addView(start);addView(extend);
        }
        private ImageView image(Context c,String name){
            ImageView v=new ImageView(c);v.setScaleType(ImageView.ScaleType.FIT_XY);
            try(InputStream in=c.getAssets().open(name)){v.setImageBitmap(BitmapFactory.decodeStream(in));}
            catch(Exception ignored){}
            return v;
        }
        private Button hit(Context c,String label,boolean more){
            Button b=new Button(c);b.setText(label);b.setTextColor(Color.TRANSPARENT);b.setBackgroundColor(Color.TRANSPARENT);b.setContentDescription(label);b.setPadding(0,0,0,0);b.setMinWidth(0);b.setMinimumWidth(0);b.setMinHeight(0);b.setMinimumHeight(0);
            b.setOnClickListener(v->RestReceiver.choose(c,more));return b;
        }
        @Override protected LayoutParams generateDefaultLayoutParams(){return new LayoutParams(-1,-1);}
        int pct(int n,float p){return Math.round(n*p);}
        void exact(View v,int w,int h){v.measure(MeasureSpec.makeMeasureSpec(Math.max(0,w),MeasureSpec.EXACTLY),MeasureSpec.makeMeasureSpec(Math.max(0,h),MeasureSpec.EXACTLY));}
        @Override protected void onMeasure(int ws,int hs){
            int w=MeasureSpec.getSize(ws),h=MeasureSpec.getSize(hs),a=pct(h,.7775f),b=h-a;
            setMeasuredDimension(w,h);exact(artFrame,w,a);exact(controls,w,b);
            exact(start,pct(w,.92f)-pct(w,.08f),pct(b,.46f)-pct(b,.01f));
            exact(extend,pct(w,.70f)-pct(w,.30f),pct(b,.79f)-pct(b,.52f));
        }
        @Override protected void onLayout(boolean changed,int l,int t,int r,int b){
            int w=r-l,h=b-t,a=pct(h,.7775f),ch=h-a;
            artFrame.layout(0,0,w,a);controls.layout(0,a,w,h);
            start.layout(pct(w,.08f),a+pct(ch,.01f),pct(w,.92f),a+pct(ch,.46f));
            extend.layout(pct(w,.30f),a+pct(ch,.52f),pct(w,.70f),a+pct(ch,.79f));
        }
        @Override protected void onAttachedToWindow(){
            super.onAttachedToWindow();
            if(!ValueAnimator.areAnimatorsEnabled())return;
            art.setScaleX(1.028f);art.setScaleY(1.028f);
            final float[] xs={0,-4,4,-3,3,-2,0},ys={0,2,-2,-2,2,0,0};
            final float density=getResources().getDisplayMetrics().density;
            shake=ValueAnimator.ofFloat(0f,1f);shake.setDuration(2000);shake.setRepeatCount(ValueAnimator.INFINITE);shake.setInterpolator(new android.view.animation.LinearInterpolator());
            shake.addUpdateListener(a->{float f=(float)a.getAnimatedValue();if(f>=.24f){art.setTranslationX(0);art.setTranslationY(0);return;}float p=f/.04f;int k=Math.min(5,(int)p);float q=p-k;art.setTranslationX((xs[k]+(xs[k+1]-xs[k])*q)*density);art.setTranslationY((ys[k]+(ys[k+1]-ys[k])*q)*density);});
            shake.start();
        }
        @Override protected void onDetachedFromWindow(){if(shake!=null){shake.cancel();shake=null;}super.onDetachedFromWindow();}
    }
}
