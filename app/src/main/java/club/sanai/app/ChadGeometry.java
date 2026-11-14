package club.sanai.app;

/** Pure pixel geometry shared by the Android view and regression tests. */
final class ChadGeometry {
    static final float CONTROL_CROP=.81f;
    final int artL,artT,artR,artB,controlL,controlT,controlR,controlB;
    final int startL,startT,startR,startB,moreL,moreT,moreR,moreB,maxShake;
    private static int p(int n,float x){return Math.round(n*x);}
    ChadGeometry(int w,int h,float density,int top,int bottom,int left,int right){
        int usableW=Math.max(1,w-left-right);
        maxShake=Math.max(1,Math.round(7*density));
        int pad=maxShake+Math.max(1,Math.round(2*density));
        int safeTop=Math.max(top,Math.round(12*density));
        int safeBottom=Math.max(bottom,Math.round(4*density));
        int usableH=Math.max(1,h-safeTop-safeBottom);
        // Keep the controls close to the bottom and remove the unused lower 19% of their source.
        int controlH=Math.max(1,Math.min(Math.round(usableW*372f/941f*CONTROL_CROP),Math.round(usableH*.31f)));
        controlL=left;controlR=w-right;controlB=h-safeBottom;controlT=controlB-controlH;
        artL=Math.min(controlR-1,left+pad);artR=Math.max(artL+1,controlR-pad);
        artT=Math.min(controlT-1,safeTop+pad);artB=Math.max(artT+1,controlT-pad);
        startL=controlL+p(usableW,.08f);startR=controlL+p(usableW,.92f);
        startT=controlT+p(controlH,.01f/CONTROL_CROP);startB=controlT+p(controlH,.46f/CONTROL_CROP);
        moreL=controlL+p(usableW,.30f);moreR=controlL+p(usableW,.70f);
        moreT=controlT+p(controlH,.52f/CONTROL_CROP);moreB=controlT+p(controlH,.79f/CONTROL_CROP);
    }
    // Continuous, clearly visible pulses: 680 ms active, 520 ms rest; no flash or scale.
    private static float wave(long elapsed,float density,double phase,float amplitude){
        long t=Math.floorMod(elapsed,1200L);if(t>=680)return 0f;
        double envelope=Math.min(1d,(680-t)/90d);
        return (float)(Math.sin(t*2*Math.PI/145d+phase)*amplitude*density*envelope);
    }
    static float shakeX(long elapsed,float density){return wave(elapsed,density,0,7);}
    static float shakeY(long elapsed,float density){return wave(elapsed,density,Math.PI/2,4);}
}
