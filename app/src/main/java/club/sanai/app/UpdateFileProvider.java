package club.sanai.app;
import android.content.*;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.*;

public final class UpdateFileProvider extends ContentProvider {
    private File file(Uri uri){if(!"/release.apk".equals(uri.getPath()))throw new IllegalArgumentException("Invalid path");return new File(getContext().getCacheDir(),"verified-release.apk");}
    @Override public boolean onCreate(){return true;}
    @Override public String getType(Uri u){file(u);return "application/vnd.android.package-archive";}
    @Override public ParcelFileDescriptor openFile(Uri u,String mode)throws FileNotFoundException{if(!"r".equals(mode))throw new FileNotFoundException();return ParcelFileDescriptor.open(file(u),ParcelFileDescriptor.MODE_READ_ONLY);}
    @Override public Cursor query(Uri u,String[] projection,String selection,String[] args,String sort){File f=file(u);String[] cols=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;MatrixCursor c=new MatrixCursor(cols);Object[] row=new Object[cols.length];for(int i=0;i<cols.length;i++){if(OpenableColumns.DISPLAY_NAME.equals(cols[i]))row[i]="SANAI-update.apk";else if(OpenableColumns.SIZE.equals(cols[i]))row[i]=f.length();}c.addRow(row);return c;}
    @Override public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}
    @Override public int delete(Uri u,String s,String[] a){throw new UnsupportedOperationException();}
    @Override public int update(Uri u,ContentValues v,String s,String[] a){throw new UnsupportedOperationException();}
}
