export const badges=[
 {key:'passport',name:'여권',image:require('../assets/ui/discovery/badge-passport-v1.png')},
 {key:'camera',name:'카메라',image:require('../assets/ui/discovery/badge-camera-v1.png')},
 {key:'camp',name:'캠핑',image:require('../assets/ui/discovery/badge-camp-v1.png')},
 {key:'gate',name:'여행의 문',image:require('../assets/ui/discovery/badge-gate-v1.png')},
 {key:'coffee',name:'커피',image:require('../assets/ui/discovery/badge-coffee-v1.png')},
] as const;
export const capsuleMachine=require('../assets/ui/discovery/capsule-machine-v1.png');
export const openedCapsule=require('../assets/ui/discovery/opened-capsule-v1.png');
// shortcut: 미확정 UUID는 프로세스 메모리에만 보존하며 재시작 복구가 필요해지면 영속화한다.
const pending=new Map<string,string>();
export const pendingBadgeDraw=(owner:string)=>pending.get(owner);
export function beginBadgeDraw(owner:string,id:string){const existing=pending.get(owner);if(existing)return existing;pending.set(owner,id);return id;}
export function confirmBadgeDraw(owner:string,id:string){if(pending.get(owner)===id)pending.delete(owner);}
export function clearBadgeDraws(){pending.clear();}
