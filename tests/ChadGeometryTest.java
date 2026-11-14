package club.sanai.app;
public class ChadGeometryTest {
    static void require(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args){
        for(int[] size:new int[][]{{1080,2340,3,90,72},{1440,3120,4,112,96},{787,1536,2,0,0},{1080,1920,3,0,0},{400,700,1,24,24}}){
            ChadGeometry g=new ChadGeometry(size[0],size[1],size[2],size[3],size[4],0,0);
            require(g.artT-g.maxShake>=size[3],"top artwork clipping");
            require(g.artL-g.maxShake>=0&&g.artR+g.maxShake<=size[0],"side artwork clipping");
            require(g.artB+g.maxShake<=g.controlT,"art overlaps controls");
            require(g.startB<g.moreT&&g.moreB<=g.controlB,"button placement");
            require(size[1]-g.moreB<=Math.max(size[4],size[2]*4)+g.controlB-g.controlT,"bottom spacing");
            float max=0;for(int t=0;t<680;t++)max=Math.max(max,Math.abs(ChadGeometry.shakeX(t,size[2])));
            require(max>=6.9f*size[2],"animation amplitude");
            require(ChadGeometry.shakeX(900,size[2])==0,"rest phase");
        }
        System.out.println("CHAD geometry and shake tests PASS");
    }
}
