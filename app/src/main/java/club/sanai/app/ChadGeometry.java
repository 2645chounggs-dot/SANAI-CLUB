package club.sanai.app;

/** Shared portrait geometry: safe artwork, full bleed, and fixed bottom controls. */
final class ChadGeometry {
    static final float CONTROL_CROP=.81f;
    static final float ART_RATIO=941f/1300f;
    final int artL,artT,artR,artB,controlL,controlT,controlR,controlB;
    final int startL,startT,startR,startB,moreL,moreT,moreR,moreB,maxShake;
    private static int p(int n,float x){return Math.round(n*x);}
    ChadGeometry(int w,int h,float density,int top,int bottom,int left,int right){
        int usableW=Math.max(1,w-left-right);
        maxShake=Math.max(1,Math.round(7*density));
        int verticalPad=Math.max(1,Math.round(5*density));
        int safeTop=Math.max(top,Math.round(4*density));
        int safeBottom=Math.max(bottom,Math.round(4*density));
        int usableH=Math.max(1,h-safeTop-safeBottom);
        int controlH=Math.max(1,Math.min(Math.round(usableW*372f/941f*CONTROL_CROP),Math.round(usableH*.30f)));
        int controlW=Math.min(usableW,Math.max(1,Math.round(controlH*941f/(372f*CONTROL_CROP))));
        controlL=left+(usableW-controlW)/2;controlR=controlL+controlW;controlB=h-safeBottom;controlT=controlB-controlH;
        // Use the full width; only a few pixels of peripheral smoke may move beyond the edge.
        // Keep all source rows and the logo visible. Limit vertical adaptation on unusually tall displays.
        int roomH=Math.max(1,controlT-safeTop-verticalPad);
        int artW=Math.min(usableW,Math.max(1,Math.round(roomH*ART_RATIO*1.10f)));
        int artH=Math.min(roomH,Math.max(1,Math.round(artW/ART_RATIO*1.28f)));
        artL=left+(usableW-artW)/2;artR=artL+artW;
        int spare=Math.max(0,roomH-artH);
        artT=safeTop+verticalPad+Math.round(spare*.25f);artB=artT+artH;
        startL=controlL+p(controlW,.08f);startR=controlL+p(controlW,.92f);
        startT=controlT+p(controlH,.01f/CONTROL_CROP);startB=controlT+p(controlH,.46f/CONTROL_CROP);
        moreL=controlL+p(controlW,.30f);moreR=controlL+p(controlW,.70f);
        moreT=controlT+p(controlH,.52f/CONTROL_CROP);moreB=controlT+p(controlH,.79f/CONTROL_CROP);
    }
    private static float wave(long elapsed,float density,double phase,float amplitude){
        long t=Math.floorMod(elapsed,1200L);if(t>=680)return 0f;
        double envelope=Math.min(1d,(680-t)/90d);
        return (float)(Math.sin(t*2*Math.PI/145d+phase)*amplitude*density*envelope);
    }
    static float shakeX(long elapsed,float density){return wave(elapsed,density,0,7);}
    static float shakeY(long elapsed,float density){return wave(elapsed,density,Math.PI/2,4);}
}
