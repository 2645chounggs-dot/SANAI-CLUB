'use strict';
/**
 * Site-device API dispatcher. To deploy: bind these functions to HTTPS routes,
 * use request Origin/TLS/size/rate limiting in a real Sites HTTP runtime,
 * and NEVER expose internal service or storage objects to untrusted callers.
 * This is source only, not a listening HTTP server.
 */
const {service}=require('./food-service.cjs');
function createDeviceApi({store,now}){
  const api=service(store,now);
  const routes={
    claim:{method:'POST',path:'/v1/devices/claim'},
    snapshot:{method:'GET',path:'/v1/devices/snapshot'},
    changes:{method:'GET',path:'/v1/devices/changes'},
    import:{method:'POST',path:'/v1/devices/import'},
    add:{method:'POST',path:'/v1/devices/add'},
    update:{method:'POST',path:'/v1/devices/update'},
    delete:{method:'POST',path:'/v1/devices/delete'}
  };
  async function dispatch(action,{deviceId,token,params={},body={}}={}){
    if(!Object.hasOwn(routes,action))throw Error('UNKNOWN_ROUTE');
    if(action==='claim'){
      // Pairing code comes from MCP after user authenticates to ChatGPT.
      return api.claimPair(body.pairingCode,body.deviceId);
    }
    // Client supplies device ID and token but NEVER a trusted user subject.
    const owner=await api.deviceSubject(deviceId,token);
    switch(action){
      case 'snapshot':return api.snapshot(owner);
      case 'changes':return api.changes(owner,params);
      case 'import':return api.importLocal(owner,body.items);
      case 'add':return api.add(owner,body.item,body.mutationId);
      case 'update':return api.update(owner,body.id,body.patch,body.expectedRevision,body.mutationId);
      case 'delete':return api.remove(owner,body.id,body.expectedRevision,body.mutationId);
    }
  }
  return {routes,dispatch};
}
module.exports={createDeviceApi};
