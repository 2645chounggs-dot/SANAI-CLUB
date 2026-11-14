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

/** Same native surface in foreground/background when overlay permission is available. */
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
    private static void edgeToEdge(WindowManager.LayoutParams p){
        if(android.os.Build.VERSION.SDK_INT>=28)p.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        if(android.os.Build.VERSION.SDK_INT>=30){p.setFitInsetsTypes(0);p.setFitInsetsSides(0);}
    }
    static boolean show(Context c, Activity activity){
        if(visible())return true;
        // With permission use the same window type for both cases, not a differently sized dialog.
        if(Settings.canDrawOverlays(c)){
            try{
                Context app=c.getApplicationContext();
                WindowManager w=app.getSystemService(WindowManager.class);
                ChadView v=new ChadView(app);
                WindowManager.LayoutParams lp=new WindowManager.LayoutParams(-1,-1,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN|
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON|WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                    PixelFormat.OPAQUE);
                edgeToEdge(lp);
                lp.gravity=Gravity.TOP|Gravity.LEFT;
                manager=w;overlay=v;w.addView(v,lp);
                return true;
            }catch(Exception e){dismiss();}
        }
        // Permission-free fallback while the app is open.
        if(activity!=null&&!activity.isFinishing()&&!activity.isDestroyed()){
            try{
                Dialog d=new Dialog(activity,android.R.style.Theme_Material_NoActionBar_Fullscreen);
                d.setContentView(new ChadView(activity));
                d.setOnCancelListener(x->RestReceiver.choose(activity,false));
                dialog=d;owner=activity;
                Window w=d.getWindow();
                if(w!=null){
                    w.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN|WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON|WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
                    WindowManager.LayoutParams p=w.getAttributes();edgeToEdge(p);w.setAttributes(p);
                    w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
                }
                d.show();
                if(w!=null)w.setLayout(-1,-1);
                return true;
            }catch(Exception e){dismiss();}
        }
        return false;
    }
    static void activityPaused(Activity a){
        if(dialog!=null&&owner==a){dismiss();RestReceiver.presentPending(a.getApplicationContext());}
    }
    /** Artwork uses full-width portrait adaptation with safe top and no repeated edge pixels. */
    private static final class ChadView extends ViewGroup {
        final Bitmap artwork,buttonArtwork,backdrop;
        final Button start,extend;
        final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
        final Paint mask=new Paint(Paint.ANTI_ALIAS_FLAG);
        final RectF artRect=new RectF(),controlRect=new RectF(),screenRect=new RectF();
        final Rect controlSrc=new Rect();
        final float density;
        long started;
        int safeTop=0,safeBottom=0,safeLeft=0,safeRight=0;
        ChadGeometry geometry;
        ChadView(Context c){
            super(c);setBackgroundColor(0xff080304);setWillNotDraw(false);setClipChildren(true);
            density=getResources().getDisplayMetrics().density;
            artwork=load(c,"chad-art-v59.jpg");
            buttonArtwork=load(c,"chad-controls-v59.jpg");
            // Small, softly filtered version of the entire composition, not an edge-strip extrusion.
            backdrop=artwork==null?null:Bitmap.createScaledBitmap(artwork,12,16,true);
            start=hit(c,"다음 세트 조지기",false);extend=hit(c,"30초 더 쉬기",true);
            addView(start);addView(extend);
            setOnApplyWindowInsetsListener((v,insets)->{
                int t=0,b=0,l=0,r=0;
                if(android.os.Build.VERSION.SDK_INT>=30){
                    android.graphics.Insets bars=insets.getInsetsIgnoringVisibility(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
                    t=bars.top;b=bars.bottom;l=bars.left;r=bars.right;
                }else{
                    t=insets.getStableInsetTop();b=insets.getStableInsetBottom();l=insets.getStableInsetLeft();r=insets.getStableInsetRight();
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
            screenRect.set(0,0,r-l,b-t);
            artRect.set(g.artL,g.artT,g.artR,g.artB);
            controlRect.set(g.controlL,g.controlT,g.controlR,g.controlB);
            if(buttonArtwork!=null)controlSrc.set(0,0,buttonArtwork.getWidth(),Math.round(buttonArtwork.getHeight()*ChadGeometry.CONTROL_CROP));
            start.layout(g.startL,g.startT,g.startR,g.startB);
            extend.layout(g.moreL,g.moreT,g.moreR,g.moreB);
        }
        private void feather(Canvas c,RectF bounds,float pixels,boolean sides){
            float fx=Math.min(pixels,bounds.width()/4f),fy=Math.min(pixels,bounds.height()/4f);
            mask.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.DST_IN));
            if(sides&&fx>0){
                mask.setShader(new LinearGradient(bounds.left,0,bounds.right,0,new int[]{0x00ffffff,0xffffffff,0xffffffff,0x00ffffff},
                    new float[]{0,fx/bounds.width(),1-fx/bounds.width(),1},Shader.TileMode.CLAMP));
                c.drawRect(bounds,mask);
            }
            if(fy>0){
                mask.setShader(new LinearGradient(0,bounds.top,0,bounds.bottom,new int[]{0x00ffffff,0xffffffff,0xffffffff,0x00ffffff},
                    new float[]{0,fy/bounds.height(),1-fy/bounds.height(),1},Shader.TileMode.CLAMP));
                c.drawRect(bounds,mask);
            }
            mask.setShader(null);mask.setXfermode(null);
        }
        @Override protected void onDraw(Canvas c){
            super.onDraw(c);ChadGeometry g=geometry;if(g==null)return;
            // Full-screen softly blurred dark/red backing is static, so shake never exposes black strips.
            if(backdrop!=null){paint.setAlpha(255);c.drawBitmap(backdrop,null,screenRect,paint);c.drawColor(0xb9080304);}
            if(artwork!=null){
                long elapsed=SystemClock.uptimeMillis()-started;
                float dx=ChadGeometry.shakeX(elapsed,density),dy=ChadGeometry.shakeY(elapsed,density);
                int clip=c.save();c.clipRect(0,0,getWidth(),g.controlT);
                c.translate(dx,dy);
                int layer=c.saveLayer(artRect,null);
                c.drawBitmap(artwork,null,artRect,paint);
                feather(c,artRect,Math.max(2,4*density),true);
                c.restoreToCount(layer);c.restoreToCount(clip);
            }
            if(buttonArtwork!=null){
                int layer=c.saveLayer(controlRect,null);
                c.drawBitmap(buttonArtwork,controlSrc,controlRect,paint);
                feather(c,controlRect,Math.max(2,4*density),true);
                c.restoreToCount(layer);
            }
            // Elapsed-time canvas animation is independent of Android's animator duration scale.
            if(isAttachedToWindow()&&getWindowVisibility()==VISIBLE)postInvalidateOnAnimation();
        }
        @Override protected void onAttachedToWindow(){super.onAttachedToWindow();started=SystemClock.uptimeMillis();requestApplyInsets();invalidate();}
        @Override protected void onWindowVisibilityChanged(int visibility){super.onWindowVisibilityChanged(visibility);if(visibility==VISIBLE)invalidate();}
    }
}
