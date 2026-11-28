import {expect,it,vi} from 'vitest';
import {updateBookEntries} from '../../frontend/src/bulkJournal';
import type {TravelApi} from '../../frontend/src/api';

it('stops a previous account before a delayed read can start a write',async()=>{
 let active=true,release!:()=>void;
 const read=vi.fn(async()=>{await new Promise<void>(r=>{release=r;});return [{id:'a',visibility:'public',status:'complete'}];});
 const update=vi.fn(),rpc=vi.fn();
 const run=updateBookEntries({request:read,update,rpc} as unknown as TravelApi,'owner',['a','b'],'private',()=>active);
 active=false;release();await run;
 expect(read).toHaveBeenCalledTimes(1);expect(update).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
});

it('checks ownership and completion on each deletion and reconciles a lost reply',async()=>{
 let removed=false;
 const read=vi.fn(async(path:string)=>{
  const query=new URL('http://local'+path).searchParams;
  expect(query.get('owner_id')).toBe('eq.owner');
  if(query.get('id')==='eq.b')return [{id:'b',status:'draft'}];
  return removed?[]:[{id:'a',status:'complete'}];
 });
 const rpc=vi.fn(async()=>{removed=true;throw Error('Lost response');});
 expect(await updateBookEntries({request:read,rpc} as unknown as TravelApi,'owner',['a','a','b'],'delete',()=>true)).toEqual({done:['a'],failed:['b']});
 expect(rpc).toHaveBeenCalledExactlyOnceWith('delete_travel_record',{record_id:'a'});
});
