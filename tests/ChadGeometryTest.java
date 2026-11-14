package club.sanai.app;
public class ChadGeometryTest {
    static void require(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args){
        for(int[] s:new int[][]{{1080,2340,3,90,72,0,0},{1440,3120,4,112,96,0,0},{787,1536,2,0,0,0,0},{1080,1920,3,0,0,0,0},{400,700,1,24,24,0,0},{1080,2160,3,90,72,24,24}}){
            ChadGeometry g=new ChadGeometry(s[0],s[1],s[2],s[3],s[4],s[5],s[6]);
            require(g.artT-4*s[2]>=s[3],"top clipping");
            require(g.artL>=s[5]&&g.artR<=s[0]-s[6],"art bounds");
            require(g.artB<=g.controlT,"art overlaps controls at rest");
            float scale=(g.artB-g.artT)*ChadGeometry.ART_RATIO/(g.artR-g.artL);
            require(scale>=.90f&&scale<=1.285f,"art adaptation too large");
            require(g.startB<g.moreT&&g.moreB<=g.controlB,"button placement");
            require(s[1]-g.moreB<=Math.max(s[4],s[2]*4)+s[2]*6+2,"button bottom gap");
            require(g.controlT-g.artB<s[1]*.10f,"large art/control gap");
            float max=0;for(int t=0;t<680;t++)max=Math.max(max,Math.abs(ChadGeometry.shakeX(t,s[2])));
            require(max>=6.9f*s[2],"animation amplitude");
            require(ChadGeometry.shakeX(900,s[2])==0,"rest phase");
        }
        System.out.println("CHAD full bleed, safe area, control position and shake tests PASS");
    }
}
