package club.sanai.app;

import android.os.SystemClock;
import android.graphics.*;
import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
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
                    if(android.os.Build.VERSION.SDK_INT>=28){WindowManager.LayoutParams p=w.getAttributes();p.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;w.setAttributes(p);}
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
    /** Draw only the art with an elapsed-time frame loop; fixed buttons are real sibling views. */
    private static final class ChadView extends ViewGroup {
        final Bitmap artwork,buttonArtwork;
        final Button start,extend;
        final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
        final RectF artRect=new RectF(), controlRect=new RectF();
        final Rect controlSrc=new Rect();
        final float density;
        long started;
        int safeTop=0,safeBottom=0,safeLeft=0,safeRight=0;
        ChadGeometry geometry;
        ChadView(Context c){
            super(c);setBackgroundColor(Color.BLACK);setWillNotDraw(false);setClipChildren(true);
            density=getResources().getDisplayMetrics().density;
            artwork=load(c,"chad-art-v59.jpg");
            buttonArtwork=load(c,"chad-controls-v59.jpg");
            start=hit(c,"다음 세트 조지기",false);extend=hit(c,"30초 더 쉬기",true);
            addView(start);addView(extend);
            setOnApplyWindowInsetsListener((v,insets)->{
                int t=0,b=0,l=0,r=0;
                if(android.os.Build.VERSION.SDK_INT>=30){
                    android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
                    t=bars.top;b=bars.bottom;l=bars.left;r=bars.right;
                }else{
                    t=insets.getSystemWindowInsetTop();b=insets.getSystemWindowInsetBottom();l=insets.getSystemWindowInsetLeft();r=insets.getSystemWindowInsetRight();
                    if(android.os.Build.VERSION.SDK_INT>=28&&insets.getDisplayCutout()!=null){
                        DisplayCutout d=insets.getDisplayCutout();t=Math.max(t,d.getSafeInsetTop());b=Math.max(b,d.getSafeInsetBottom());l=Math.max(l,d.getSafeInsetLeft());r=Math.max(r,d.getSafeInsetRight());
                    }
                }
                if(t!=safeTop||b!=safeBottom||l!=safeLeft||r!=safeRight){safeTop=t;safeBottom=b;safeLeft=l;safeRight=r;requestLayout();}
                return insets;
            });
        }
        private Bitmap load(Context c,String name){
            try(InputStream in=c.getAssets().open(name)){return BitmapFactory.decodeStream(in);}catch(Exception ignored){return null;}
        }
        private Button hit(Context c,String label,boolean more){
            Button b=new Button(c);b.setText(label);b.setTextColor(Color.TRANSPARENT);b.setBackgroundColor(Color.TRANSPARENT);b.setContentDescription(label);b.setPadding(0,0,0,0);b.setMinWidth(0);b.setMinimumWidth(0);b.setMinHeight(0);b.setMinimumHeight(0);
            b.setOnClickListener(v->RestReceiver.choose(c,more));return b;
        }
        @Override protected LayoutParams generateDefaultLayoutParams(){return new LayoutParams(-1,-1);}
        void exact(View v,int w,int h){v.measure(MeasureSpec.makeMeasureSpec(Math.max(0,w),MeasureSpec.EXACTLY),MeasureSpec.makeMeasureSpec(Math.max(0,h),MeasureSpec.EXACTLY));}
        @Override protected void onMeasure(int ws,int hs){
            int w=MeasureSpec.getSize(ws),h=MeasureSpec.getSize(hs);
            setMeasuredDimension(w,h);
            geometry=new ChadGeometry(w,h,density,safeTop,safeBottom,safeLeft,safeRight);
            exact(start,geometry.startR-geometry.startL,geometry.startB-geometry.startT);
            exact(extend,geometry.moreR-geometry.moreL,geometry.moreB-geometry.moreT);
        }
        @Override protected void onLayout(boolean changed,int l,int t,int r,int b){
            ChadGeometry g=geometry;if(g==null)return;
            artRect.set(g.artL,g.artT,g.artR,g.artB);
            controlRect.set(g.controlL,g.controlT,g.controlR,g.controlB);
            if(buttonArtwork!=null)controlSrc.set(0,0,buttonArtwork.getWidth(),Math.round(buttonArtwork.getHeight()*ChadGeometry.CONTROL_CROP));
            start.layout(g.startL,g.startT,g.startR,g.startB);
            extend.layout(g.moreL,g.moreT,g.moreR,g.moreB);
        }
        @Override protected void onDraw(Canvas c){
            super.onDraw(c);ChadGeometry g=geometry;if(g==null)return;
            // Extend outer artwork edges under the safe area and moving layer, instead of enlarging the artwork.
            if(artwork!=null){
                int bw=artwork.getWidth(),bh=artwork.getHeight();
                c.drawBitmap(artwork,new Rect(0,0,bw,1),new RectF(0,0,getWidth(),g.artT+g.maxShake),paint);
                c.drawBitmap(artwork,new Rect(0,0,1,bh),new RectF(0,g.artT,g.artL+g.maxShake,g.controlT),paint);
                c.drawBitmap(artwork,new Rect(bw-1,0,bw,bh),new RectF(g.artR-g.maxShake,g.artT,getWidth(),g.controlT),paint);
                c.drawBitmap(artwork,new Rect(0,bh-1,bw,bh),new RectF(0,g.artB-g.maxShake,getWidth(),g.controlT),paint);
                long elapsed=SystemClock.uptimeMillis()-started;
                float dx=ChadGeometry.shakeX(elapsed,density),dy=ChadGeometry.shakeY(elapsed,density);
                int save=c.save();c.clipRect(0,0,getWidth(),g.controlT);
                c.translate(dx,dy);c.drawBitmap(artwork,null,artRect,paint);c.restoreToCount(save);
            }
            if(buttonArtwork!=null){
                c.drawBitmap(buttonArtwork,controlSrc,controlRect,paint);
                int bh=controlSrc.bottom,bw=controlSrc.right;
                if(g.controlB<getHeight())c.drawBitmap(buttonArtwork,new Rect(0,bh-1,bw,bh),new RectF(0,g.controlB,getWidth(),getHeight()),paint);
            }
            // No ValueAnimator: this alert's explicitly requested shake does not depend on Android animator duration scale.
            if(isAttachedToWindow()&&getWindowVisibility()==VISIBLE)postInvalidateOnAnimation();
        }
        @Override protected void onAttachedToWindow(){super.onAttachedToWindow();started=SystemClock.uptimeMillis();requestApplyInsets();invalidate();}
        @Override protected void onWindowVisibilityChanged(int visibility){super.onWindowVisibilityChanged(visibility);if(visibility==VISIBLE)invalidate();}
    }
}
