import {provinceLabels} from './provinces';
import {useThemeColors,useThemeStyles,type ThemeColors} from './ThemeContext';
import Pressable from './Feedback';
import TravelerAvatar from './Avatar';
import {JournalIcon} from './Journal';
import React, {useEffect, useRef, useState} from 'react';
import Text from './FontText';
import {ActivityIndicator, Image, Modal, ScrollView, Share, StyleSheet, TextInput, View} from 'react-native';
import * as Linking from 'expo-linking';
import {ApiError} from './api';
import {api} from './runtime';

type Props = {session: any; onChanged?: () => void};
type Author = {id: string; display_name: string | null; avatar_url: string | null; user_code?: string;contact_code?:string};
type Follow = {followee_id: string; created_at: string};
type Connection = {requester_id: string; recipient_id: string; status: 'pending' | 'accepted'; created_at: string};
const authorFields = 'id,display_name,avatar_url,user_code';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const userIdPattern = /^[A-Z][0-9][A-Z0-9]{4}$/i;
export const isUserId = (value: unknown): value is string => typeof value === 'string' && (uuid.test(value) || userIdPattern.test(value) || /^[0-9]{6}$/.test(value));

function path(table: string, query: Record<string, string>) {
  return `/rest/v1/${table}?${new URLSearchParams(query)}`;
}

function searchPath(value: string, offset = 0) {
  const term = value.trim();
  const query: Record<string, string> = {select: authorFields, order: 'display_name.asc,id.asc', limit: '20', offset: String(offset)};
  if (uuid.test(term)) query.id = `eq.${term}`;
  else if (term) query.display_name = `ilike.*${term.replace(/[\\%_*]/g, '\\$&')}*`;
  return path('user_directory', query);
}

function useUserId(owner?: string) {
  const [code, setCode] = useState(''), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true; setCode(''); setError('');
    if (owner) void api.request(path('profiles', {id:`eq.${owner}`,select:'user_code'})).then(rows => {
      if (!current) return;
      if (!userIdPattern.test(rows[0]?.user_code ?? '')) throw new Error('Missing user ID');
      setCode(rows[0].user_code);
    }).catch(() => {if (current) setError('유저 ID를 불러오지 못했어요. 다시 시도해 주세요.');});
    return () => {current = false;};
  }, [owner, attempt]);
  return {code, error, retry:() => setAttempt(value => value + 1)};
}

function nickname(value: string) {
  const trimmed = value.trim();
  if (!trimmed || Array.from(trimmed).length > 30) throw new Error('닉네임은 앞뒤 공백을 제외한 1~30자로 입력해 주세요.');
  return trimmed;
}

async function changeFollow(owner: string, target: string, remove: boolean) {
  if (!uuid.test(owner) || !uuid.test(target) || owner === target) throw new Error('팔로우 대상을 확인해 주세요.');
  const pair = {follower_id: `eq.${owner}`, followee_id: `eq.${target}`};
  if (remove) {
    await api.request(path('follows', pair), 'DELETE');
    return;
  }
  try {
    const rows = await api.request('/rest/v1/follows', 'POST', {follower_id: owner, followee_id: target});
    if (!rows.some((row: any) => row.follower_id === owner && row.followee_id === target)) throw new Error('팔로우 결과를 확인하지 못했습니다. 다시 시도해 주세요.');
  } catch (error) {
    if (!(error instanceof ApiError) || error.serverCode !== '23505') throw error;
    const rows = await api.request(path('follows', {...pair, select: 'follower_id,followee_id'}));
    if (!rows.some((row: any) => row.follower_id === owner && row.followee_id === target)) throw error;
  }
}

function message(error: unknown) {
  if(error instanceof ApiError&&error.status===404&&error.serverCode==='PGRST202')return '서버 업데이트가 필요해요. 잠시 후 다시 확인해 주세요.';
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다. 다시 시도해 주세요.';
}

function Button({label, onPress, disabled = false, secondary = false, compact=false}: {label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; compact?:boolean}) {
 const s=useThemeStyles(makeStyles);
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed}) => [s.button, compact&&s.compactButton, secondary && s.secondary, (disabled || pressed) && s.dim]}>
    <Text style={[s.buttonText,compact&&s.compactButtonText, secondary && s.secondaryText]}>{label}</Text>
  </Pressable>;
}

function Notice({children, error = false}: {children: string; error?: boolean}) {
 const s=useThemeStyles(makeStyles);
  return <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[s.hint, error && s.error]}>{children}</Text>;
}

function Avatar({url,size=44}: {url: string | null;size?:number}) {return <TravelerAvatar url={url} size={size}/>;}

type ProfileProps=Props & {onSummaryReady?:()=>void;visits?:number|null;visitsFailed?:boolean;onStamps?:()=>void;onFollowing?:()=>void;showStamps?:boolean;children?:React.ReactNode;firstSetup?:boolean};

export function ProfileEditor(props: ProfileProps) {
 const s=useThemeStyles(makeStyles);
  return props.session?.user?.id ? <ProfileForm key={props.session.user.id} {...props}/>
    : <View style={s.sheet}><Text accessibilityRole="header" style={s.title}>나의 프로필</Text><Notice>로그인하면 닉네임과 공개 프로필을 설정할 수 있어요. My에서 로그인해 주세요.</Notice></View>;
}

function ProfileForm({session, onChanged,visits=null,visitsFailed=false,onStamps=()=>{},onFollowing=()=>{},showStamps=false,children,onSummaryReady,firstSetup=false}: ProfileProps) {
 const c=useThemeColors();
 const s=useThemeStyles(makeStyles);
  const [editing,setEditing]=useState(firstSetup);
  const [snapshot,setSnapshot]=useState<{name:string;avatar:string|null;enabled:boolean}|null>(null);
  const owner = session.user.id as string;
  const identity = useUserId(owner);
  const googleAvatar = typeof session.user.user_metadata?.avatar_url === 'string' ? session.user.user_metadata.avatar_url : null;
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attempt, setAttempt] = useState(0);
  const active = useRef(true);
  const savingRef = useRef(false);

  useEffect(() => {
    active.current = true;
    let current = true;
    setLoading(true); setError('');
    api.request(path('profiles', {id: `eq.${owner}`, select: 'display_name,avatar_url,public_profile_enabled'})).then(rows => {
      if (!current) return;
      if (!rows.length) throw new Error('프로필을 찾을 수 없습니다. 다시 로그인해 주세요.');
      setName(rows[0].display_name ?? '');
      // 저장된 선택만 보존하며 Auth 메타데이터의 사진을 자동 선택하지 않는다.
      const storedAvatar=typeof rows[0].avatar_url==='string'&&/^https:\/\/(lh[0-9]+\.googleusercontent\.com|[a-z0-9-]+\.ggpht\.com)\/[^\s\\]+$/.test(rows[0].avatar_url)?rows[0].avatar_url:null;
      setAvatar(storedAvatar);
      setSnapshot({name:rows[0].display_name??'',avatar:storedAvatar,enabled:rows[0].public_profile_enabled===true});
      setLoaded(true);
    }).catch(error => {if (current) setError(message(error));}).finally(() => {if (current) setLoading(false);});
    return () => {current = false; active.current = false;};
  }, [owner, attempt]);

  useEffect(()=>{if(!loaded||loading||editing||showStamps)return;const frame=requestAnimationFrame(()=>onSummaryReady?.());return()=>cancelAnimationFrame(frame);},[loaded,loading,editing,showStamps,snapshot,onSummaryReady]);

  async function save() {
    if (savingRef.current || !loaded) return;
    setError(''); setSuccess('');
    let displayName: string;
    try {displayName = nickname(name);} catch (error) {setError(message(error)); return;}
    savingRef.current = true; setSaving(true);
    try {
      const values={display_name:displayName,avatar_url:avatar,public_profile_enabled:true};
      const rows = firstSetup?[await api.rpc('complete_profile_setup',values)]:await api.request(path('profiles',{id:`eq.${owner}`,select:'display_name,avatar_url,public_profile_enabled'}),'PATCH',values);
      if (!rows.length) throw new Error('프로필이 저장되지 않았습니다. 다시 시도해 주세요.');
      if (!active.current) return;
      setName(rows[0].display_name ?? displayName);
      setAvatar(rows[0].avatar_url ?? null);
      setSnapshot({name:rows[0].display_name??displayName,avatar:rows[0].avatar_url??null,enabled:rows[0].public_profile_enabled===true});
      if(!firstSetup)setEditing(false);setSuccess('프로필을 저장했어요.');
      onChanged?.();
    } catch (error) {if (active.current) setError(message(error));}
    finally {savingRef.current = false; if (active.current) setSaving(false);}
  }

  const disabled = loading || saving || !loaded;
  if(showStamps&&!editing)return <>{children}</>;
  const profileName=snapshot?.name||(loading?'불러오는 중…':error?'확인 필요':'여행자');
  const visitLabel=visits===null?(visitsFailed?'확인 필요':'확인 중'):`${visits} / ${Object.keys(provinceLabels).length}`;
  if(!editing)return <View style={s.profilePage}>
    <View style={s.profileCard}>
      <View style={s.profileHeading}><Text accessibilityRole="header" style={s.profileTitle}>나의 프로필</Text><Button compact label="프로필 수정" disabled={disabled} onPress={()=>{setError('');setSuccess('');setEditing(true);}} secondary/></View>
      {loading&&<ActivityIndicator accessibilityLabel="프로필 불러오는 중"/>}
      <View style={s.profileIdentity}><TravelerAvatar url={snapshot?.avatar} portrait/><View style={s.flex}>
        <Text testID="profile-name" accessibilityLabel={`내 프로필 이름 · ${profileName}`} style={s.profileName}>{profileName}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`여행 스탬프 보기 · ${visitLabel}`} onPress={onStamps} style={s.visitLink}>
          <View style={s.visitBadge}><Text testID="profile-visits" accessibilityLabel={`내 방문 지역 수 · ${visitLabel}`} style={s.visitNumber}>{visitLabel}</Text><Text style={s.profileSmall}>지역</Text></View>
          <Text style={s.profileLink}>여행 스탬프{String.fromCharCode(10)}보러 가기 ›</Text>
        </Pressable>
      </View></View>
      <Text style={s.profileSmall}>유저 ID</Text><Text selectable accessibilityLabel="유저 ID" style={s.profileIdentifier}>{identity.code||'불러오는 중…'}</Text>
      {!!identity.error&&<><Notice error>{identity.error}</Notice><Button label="유저 ID 다시 불러오기" onPress={identity.retry} secondary/></>}
      <View style={s.profileHeading}><Button compact label="내 팔로잉 보기" onPress={onFollowing} secondary/><Text style={s.profileSmall}>{snapshot?snapshot.enabled?'프로필 공개':'프로필 저장 후 공개':'공개 상태 확인 중'}</Text></View>
      <Text style={s.profileSmall}>프로필과 여행 기록 공개 범위는 별개예요.</Text>
      {!!error&&<Notice error>{error}</Notice>}{!!success&&<Notice>{success}</Notice>}
      {!loaded&&!loading&&<Button label="프로필 다시 불러오기" onPress={()=>setAttempt(value=>value+1)} secondary/>}
    </View>
    {children}
  </View>;
  return <View style={s.sheet}>
    <Text accessibilityRole="header" style={s.title}>{firstSetup?'여행을 시작할 프로필':'나의 프로필'}</Text>
    <Text style={s.label}>유저 ID</Text><Text selectable accessibilityLabel="유저 ID" style={s.identifier}>{identity.code || '불러오는 중…'}</Text>
    {!!identity.error && <><Notice error>{identity.error}</Notice><Button label="유저 ID 다시 불러오기" onPress={identity.retry} secondary/></>}
    <Text style={s.hint}>여행 이야기에 함께 표시할 이름과 사진을 골라요.</Text>
    {loading && <ActivityIndicator color={c.sea} accessibilityLabel="프로필 불러오는 중"/>}
    <Avatar url={avatar}/>
    <Text style={s.label}>닉네임</Text>
    <TextInput accessibilityLabel="닉네임" placeholder="여행자 이름을 입력해 주세요" placeholderTextColor={c.muted} value={name}
      onChangeText={value => {setName(value); setSuccess('');}} editable={!disabled} style={s.input}/>
    <Text style={s.hint}>앞뒤 공백을 제외한 1~30자. 같은 이름도 사용할 수 있어요.</Text>
    <View style={s.actions}>
      <Pressable accessibilityRole="radio" accessibilityState={{checked: avatar === null, disabled}} disabled={disabled} onPress={() => {setAvatar(null); setSuccess('');}} style={[s.choice, avatar === null && s.selected]}><Text style={s.choiceText}>기본 아바타</Text></Pressable>
      {googleAvatar && <Pressable accessibilityRole="radio" accessibilityState={{checked: avatar === googleAvatar, disabled}} disabled={disabled} onPress={() => {setAvatar(googleAvatar); setSuccess('');}} style={[s.choice, avatar === googleAvatar && s.selected]}><Text style={s.choiceText}>Google 사진 사용</Text></Pressable>}
    </View>
    <Text style={s.hint}>닉네임·선택한 사진·유저 ID는 공개 정보예요.</Text>
    <Text style={s.hint}>Google 사진은 직접 선택한 경우에만 사용하고, 여행 기록의 공개 범위는 기록별로 설정해요.</Text>
    {!!error && <Notice error>{error}</Notice>}
    {!!success && <Notice>{success}</Notice>}
    {!loaded && !loading && <Button label="프로필 다시 불러오기" onPress={() => setAttempt(value => value + 1)} secondary/>}
    <Button label={saving ? '저장 중…' : firstSetup?'프로필 저장하고 시작':'프로필 저장'} onPress={() => void save()} disabled={disabled}/>
    {!firstSetup&&<Button label="프로필 수정 취소" disabled={saving} onPress={()=>{if(snapshot){setName(snapshot.name);setAvatar(snapshot.avatar);}setError('');setSuccess('');setEditing(false);}} secondary/>}
  </View>;
}

export function ProfileSetupGate({session,onLogout}:{session:any;onLogout:()=>Promise<void>}) {
 const c=useThemeColors(),[complete,setComplete]=useState<boolean|null>(null),[checking,setChecking]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[unsupported,setUnsupported]=useState(false),[loggingOut,setLoggingOut]=useState(false),[logoutError,setLogoutError]=useState('');
 const active=useRef(true),logoutBusy=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 useEffect(()=>{let current=true;setChecking(true);setError('');setUnsupported(false);void api.rpc('profile_setup_status',{}).then(result=>{if(current){if(typeof result.profile_setup_complete!=='boolean')throw new Error('Invalid profile setup status');setComplete(result.profile_setup_complete);}}).catch(reason=>{if(!current)return;if(reason instanceof ApiError&&reason.status===404){setUnsupported(true);setError('첫 프로필 설정은 서버 업데이트 후 사용할 수 있어요. My에서 프로필을 설정할 수 있어요.');}else setError('프로필 설정 상태를 확인하지 못했어요. 다시 시도해 주세요.');}).finally(()=>{if(current)setChecking(false);});return()=>{current=false;};},[session.user.id,attempt]);
 async function logout(){if(logoutBusy.current)return;logoutBusy.current=true;setLoggingOut(true);setLogoutError('');try{await onLogout();}catch{if(active.current)setLogoutError('로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');}finally{logoutBusy.current=false;if(active.current)setLoggingOut(false);}}
 if(unsupported)return <Text accessibilityLiveRegion="polite" style={{color:c.muted,padding:8}}>{error}</Text>;
 return <Modal visible={checking||complete===false||!!error} animationType="none" onRequestClose={()=>{}}><ScrollView contentContainerStyle={{flexGrow:1,justifyContent:'center',padding:20,backgroundColor:c.paper}} keyboardShouldPersistTaps="handled"><View style={{width:'100%',maxWidth:640,alignSelf:'center'}}>
  {checking?<ActivityIndicator accessibilityLabel="프로필 설정 확인 중"/>:complete===false?<ProfileForm session={session} firstSetup onChanged={()=>setComplete(true)}/>:<><Notice error>{error}</Notice><Button label="프로필 설정 다시 확인" onPress={()=>setAttempt(value=>value+1)}/></>}
  {checking&&<Text style={{color:c.muted}}>프로필 설정 확인 중</Text>}
  {!!logoutError&&<Notice error>{logoutError}</Notice>}<Button label={loggingOut?'로그아웃 중…':'로그아웃'} disabled={loggingOut} onPress={()=>void logout()} secondary/>
 </View></ScrollView></Modal>;
}

type FriendsProps = Props & {onMap?: (ownerId: string) => void; inviteCode?: string; onInviteHandled?: () => void};
export function Friends(props: FriendsProps) {
  return <FriendsList key={props.session?.user?.id ?? 'guest'} {...props}/>;
}

function FriendsList({session, onChanged, onMap, inviteCode, onInviteHandled}: FriendsProps) {
 const c=useThemeColors();
 const s=useThemeStyles(makeStyles);
  const owner = session?.user?.id as string | undefined;
  const identity = useUserId(owner);
  const [pane,setPane]=useState<'following'|'search'>(()=>!owner||isUserId(inviteCode)?'search':'following');
  const inviteLink = identity.code ? Linking.createURL('/', {scheme: 'mytraveldex', queryParams: {friend: identity.code}}) : '';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Author[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [loading, setLoading] = useState(!!owner);
  const [loaded, setLoaded] = useState(!owner);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const active = useRef(true);
  const searchRequest = useRef(0);
  const listRequest = useRef(0);

  async function loadFollows() {
    if (!owner) return;
    const request = ++listRequest.current;
    setLoading(true); setListError('');
    try {
      const [rows, relationships]: [Follow[], Connection[]] = await Promise.all([
        api.listPages(path('follows', {follower_id: `eq.${owner}`, select: 'followee_id,created_at', order: 'created_at.desc,followee_id.asc'}),row=>row.followee_id),
        api.listPages(path('friend_requests', {select: 'requester_id,recipient_id,status,created_at', order: 'created_at.desc,requester_id.asc,recipient_id.asc'}),row=>`${row.requester_id}/${row.recipient_id}`),
      ]);
      if (!active.current || request !== listRequest.current) return;
      // 상대가 공개를 해제해도 본인의 관계와 해제 버튼은 남긴다.
      const profiles: Author[] = [];
      const people = [...new Set([...rows.map(row => row.followee_id), ...relationships.map(row => row.requester_id === owner ? row.recipient_id : row.requester_id)])];
      for (let i = 0; i < people.length; i += 20) {
        if (!active.current || request !== listRequest.current) return;
        const ids = people.slice(i, i + 20);
        if (!ids.every(id => uuid.test(id))) throw new Error('팔로잉 정보를 확인하지 못했습니다.');
        profiles.push(...await api.listPages(path('user_directory', {select: authorFields, id: `in.(${ids.join(',')})`,order:'id.asc'})));
      }
      if (!active.current || request !== listRequest.current) return;
      setFollows(rows); setConnections(relationships); setAuthors(Object.fromEntries(profiles.map(profile => [profile.id, profile]))); setLoaded(true);
    } catch (error) {if (active.current && request === listRequest.current) setListError(message(error));}
    finally {if (active.current && request === listRequest.current) setLoading(false);}
  }

  useEffect(() => {
    active.current = true;
    void loadFollows();
    if (!isUserId(inviteCode)) void search('');
    return () => {active.current = false; searchRequest.current++; listRequest.current++;};
  }, [owner]);

  useEffect(() => {
    if (isUserId(inviteCode)) {setPane('search');setQuery(inviteCode); void search(inviteCode);}
  }, [inviteCode]);

  async function search(value: string, page = 0) {
    const request = ++searchRequest.current;
    setSearching(true); setSearchError('');
    try {
      const term = value.trim();
      let rows: Author[];
      if(owner&&isUserId(term)&&!uuid.test(term)){
        const contacts=await api.rpc('lookup_contact_id',{user_id:term.toUpperCase()});
        if(!active.current||request!==searchRequest.current)return;
        let publicRows:Author[]=[];
        if(contacts.length)try{publicRows=await api.request(path('user_directory',{select:authorFields,id:`eq.${contacts[0].id}`}));}catch{/* 공개 정보 보완 실패도 정확 ID 연락처를 버리지 않는다. */}
        rows=contacts.map((contact:{id:string;user_code:string})=>({id:contact.id,user_code:contact.user_code,contact_code:contact.user_code,display_name:publicRows.find(row=>row.id===contact.id)?.display_name??null,avatar_url:publicRows.find(row=>row.id===contact.id)?.avatar_url??null}));
      }else rows=isUserId(term)&&!uuid.test(term)?await api.rpc('lookup_user_id',{user_id:term.toUpperCase()}):await api.request(searchPath(value,page));
      if (!active.current || request !== searchRequest.current) return;
      setResults(rows); setSearched(true); setLastQuery(value); setOffset(page); setMore(rows.length === 20);
    } catch (error) {if (active.current && request === searchRequest.current) setSearchError(message(error));}
    finally {if (active.current && request === searchRequest.current) setSearching(false);}
  }

  async function toggle(target: string, remove: boolean) {
    if (!owner || !loaded || busyRef.current) return;
    busyRef.current = true; setBusy(target); setActionError(''); setSuccess('');
    // 갱신 전 시작된 목록 응답이 변경 결과를 덮어쓰지 않게 한다.
    listRequest.current++; setLoading(false);
    try {
      await changeFollow(owner, target, remove);
      if (!active.current) return;
      setFollows(previous => remove ? previous.filter(row => row.followee_id !== target)
        : previous.some(row => row.followee_id === target) ? previous : [{followee_id: target, created_at: new Date().toISOString()}, ...previous]);
      const profile = results.find(row => row.id === target);
      if (profile) setAuthors(previous => ({...previous,[target]:{id:profile.id,user_code:profile.user_code,display_name:profile.display_name,avatar_url:profile.avatar_url}}));
      setSuccess(remove ? '팔로우를 해제했어요.' : '팔로우했어요. 친구의 공개 여행을 만나보세요.');
      onChanged?.();
    } catch (error) {if (active.current) setActionError(message(error));}
    finally {busyRef.current = false; if (active.current) setBusy(null);}
  }

  function connection(target: string) {
    return connections.find(row => row.requester_id === target || row.recipient_id === target);
  }

  async function connect(target: string, action: 'request' | 'accept' | 'remove',contactCode?:string) {
    if (!owner || !loaded || busyRef.current || !uuid.test(target) || owner === target) return;
    busyRef.current = true; setBusy(target); setActionError(''); setSuccess(''); listRequest.current++; setLoading(false);
    try {
      const existing = connection(target);
      const pair = existing ? {requester_id: existing.requester_id, recipient_id: existing.recipient_id} : {requester_id: owner, recipient_id: target};
      const filter = path('friend_requests', {requester_id: `eq.${pair.requester_id}`, recipient_id: `eq.${pair.recipient_id}`});
      const rows: Connection[] = await (action === 'request' ? contactCode?[await api.rpc('request_friend_by_id',{user_id:contactCode})]:api.request('/rest/v1/friend_requests', 'POST', pair)
        : action === 'accept' ? api.request(filter, 'PATCH', {status: 'accepted'}) : api.request(filter, 'DELETE'));
      if (!rows.length) throw new Error('친구 요청이 변경되었어요. 목록을 새로고침한 뒤 다시 확인해 주세요.');
      if (!active.current) return;
      setConnections(previous => [...previous.filter(row => row.requester_id !== target && row.recipient_id !== target), ...(action === 'remove' ? [] : rows)]);
      const profile = results.find(row => row.id === target);
      if (profile) setAuthors(previous => ({...previous,[target]:{id:profile.id,user_code:profile.user_code,display_name:profile.display_name,avatar_url:profile.avatar_url}}));
      setSuccess(action === 'request' ? '친구 요청을 보냈어요.' : action === 'accept' ? '친구가 되었어요. 공개된 여행을 함께 볼 수 있어요.' : '친구 관계 또는 요청을 삭제했어요. 기존 팔로우는 유지돼요.');
      if (action !== 'remove' && isUserId(inviteCode) && lastQuery.trim().toUpperCase() === inviteCode.toUpperCase() && results.some(row => row.id === target)) onInviteHandled?.();
      onChanged?.();
    } catch (error) {
      if (active.current) {
        setActionError(error instanceof ApiError && error.serverCode === '23505' ? '이미 요청이나 친구 관계가 있어요. 목록을 새로고침해 주세요.' : message(error));
      }
    } finally {busyRef.current = false; if (active.current) setBusy(null);}
  }

  function connectionControls(id: string,contactCode?:string) {
    if (id === owner) return null;
    const current = connection(id), disabled = !owner || !loaded || loading || busy !== null;
    if (!current) return <Button compact label={owner ? '친구 요청' : '로그인 후 친구 요청'} disabled={disabled} onPress={() => void connect(id, 'request',contactCode)}/>;
    if (current.status === 'accepted') return <><Text style={s.friendHint}>친구</Text><Button compact label="친구 삭제" disabled={disabled} onPress={() => void connect(id, 'remove')} secondary/></>;
    return current.requester_id === owner ? <Button compact label="요청 취소" disabled={disabled} onPress={() => void connect(id, 'remove')} secondary/>
      : <><Button compact label="친구 수락" disabled={disabled} onPress={() => void connect(id, 'accept')}/><Button compact label="친구 거절" disabled={disabled} onPress={() => void connect(id, 'remove')} secondary/></>;
  }

  function row(id: string, profile: Author | undefined, followed: boolean, relationActions=true) {
    const current=connection(id),canMap=!!onMap&&(followed||current?.status==='accepted');
    const name=profile?.display_name||'여행자',code=profile?.user_code||'유저 ID 비공개';
    const mapLabel=current?.status==='accepted'?'친구 지도 보기':'지도 보기';
    const identity=<>{profile?<Avatar url={profile.avatar_url} size={48}/>:<View style={s.anonymousAvatar}><JournalIcon name="account" size={32}/></View>}<View style={s.flex}><Text numberOfLines={2} style={s.friendName}>{name}</Text><Text selectable style={s.friendIdentifier}>{code}</Text>{!profile&&<Text style={s.friendHint}>공개 프로필을 사용하지 않는 여행자</Text>}{canMap&&<Text style={s.mapLink}>공개 여행 지도 ›</Text>}</View></>;
    return <View key={id} testID={`friend-person-${id}`} style={s.person}>
      {canMap?<Pressable accessibilityRole="button" accessibilityLabel={`${mapLabel} · ${name} · ${code}`} disabled={loading||busy!==null} onPress={()=>onMap?.(id)} style={({pressed})=>[s.identity,pressed&&{backgroundColor:c.warm}]}>{identity}</Pressable>:<View style={s.identity}>{identity}</View>}
      <View style={s.friendActions}>
        {relationActions&&connectionControls(id,profile?.contact_code)}
        {id===owner?<Text style={s.friendHint}>내 프로필</Text>:<Button compact label={busy===id?'처리 중…':followed?'팔로우 해제':owner?'팔로우':'로그인 후 팔로우'} disabled={!owner||!loaded||loading||busy!==null} onPress={()=>void toggle(id,followed)} secondary={followed}/>}
      </View>
    </View>;
  }

  return <View style={s.container}>
    <View style={s.friendHeading}><Text accessibilityRole="header" style={s.friendTitle}>친구</Text>{owner&&<View><Text style={s.friendHint}>유저 ID</Text><Text selectable accessibilityLabel="유저 ID" style={s.friendIdentifier}>{identity.code||(identity.error?'확인 필요':'불러오는 중…')}</Text></View>}</View>
    <View accessibilityRole="tablist" accessibilityLabel="친구 메뉴" style={s.friendTabs}>
      <Pressable nativeID="friends-following-tab" accessibilityRole="tab" accessibilityState={{selected:pane==='following'}} aria-selected={pane==='following'} aria-controls="friends-following-panel" disabled={!owner} onPress={()=>setPane('following')} style={s.friendTab}><Text style={[s.friendTabText,pane==='following'&&{fontWeight:'700'}]}>팔로잉{owner&&loaded&&!loading&&!listError?` ${follows.length}`:''}</Text><View style={[s.friendTabLine,pane!=='following'&&{opacity:0}]}/></Pressable>
      <Pressable nativeID="friends-search-tab" accessibilityRole="tab" accessibilityState={{selected:pane==='search'}} aria-selected={pane==='search'} aria-controls="friends-search-panel" onPress={()=>setPane('search')} style={s.friendTab}><Text style={[s.friendTabText,pane==='search'&&{fontWeight:'700'}]}>여행자 찾기</Text><View style={[s.friendTabLine,pane!=='search'&&{opacity:0}]}/></Pressable>
    </View>
    {!owner&&<Notice>공개 프로필은 누구나 찾을 수 있어요. 팔로우와 내 목록을 사용하려면 My에서 로그인해 주세요.</Notice>}
    {!!actionError&&<Notice error>{actionError}</Notice>}{!!success&&<Notice>{success}</Notice>}
    {inviteCode&&<View><Notice>초대한 여행자를 유저 ID로 검색했어요. 친구 요청은 직접 선택해 주세요.</Notice><Button label="초대 검색 닫기" onPress={()=>onInviteHandled?.()} secondary/></View>}
    {!!identity.error&&<><Notice error>{identity.error}</Notice><Button label="유저 ID 다시 불러오기" onPress={identity.retry} secondary/></>}
    {owner&&<><View style={s.friendSectionHeading}><Text accessibilityRole="header" style={s.friendSectionTitle}>{pane==='following'?'내가 팔로우한 여행자':'친구 관계 확인'}</Text><Button compact label={loading?'목록 불러오는 중…':'목록 새로고침'} onPress={()=>void loadFollows()} disabled={loading||busy!==null} secondary/></View>{loading&&<ActivityIndicator color={c.sea} accessibilityLabel="팔로잉 목록 불러오는 중"/>}{!!listError&&<Notice error>{listError}</Notice>}</>}
    {pane==='following'&&owner&&<View nativeID="friends-following-panel" role="tabpanel" aria-labelledby="friends-following-tab" style={s.friendSheet}>
      <View accessibilityLabel="팔로잉 목록">
        {loaded&&!loading&&!listError&&!follows.length&&<><Notice>아직 팔로우한 여행자가 없어요. 여행자 찾기에서 닉네임이나 유저 ID로 찾아보세요.</Notice><Button label="여행자 찾기" onPress={()=>setPane('search')} secondary/></>}
        {follows.map(follow=>row(follow.followee_id,authors[follow.followee_id],true,false))}
      </View>
      <View accessibilityLabel="친구와 요청 목록" style={s.friendSheet}><Text accessibilityRole="header" style={s.friendSectionTitle}>친구와 요청</Text>
        {!connections.length&&loaded&&!loading&&!listError&&<Notice>아직 친구나 받은 요청이 없어요.</Notice>}
        {connections.map(current=>{const id=current.requester_id===owner?current.recipient_id:current.requester_id;return <View key={id}><Text style={s.friendHint}>{current.status==='accepted'?'수락한 친구':current.requester_id===owner?'보낸 친구 요청':'받은 친구 요청'}</Text>{row(id,authors[id],follows.some(follow=>follow.followee_id===id))}</View>;})}
      </View>
    </View>}
    {pane==='search'&&<View nativeID="friends-search-panel" role="tabpanel" aria-labelledby="friends-search-tab"><View accessibilityLabel="전체 여행자 목록" style={s.friendSheet}>
      <View style={s.friendSearch}><TextInput accessibilityLabel="공개 여행자 닉네임 또는 유저 ID" placeholder="닉네임 또는 6자리 유저 ID" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} style={[s.input,s.flex,{fontSize:13}]} returnKeyType="search" onSubmitEditing={()=>void search(query)} autoCapitalize="none"/><Button compact label={searching?'검색 중…':'여행자 검색'} onPress={()=>void search(query)} disabled={searching}/></View>
      <Text style={s.friendHint}>공개에 동의한 프로필만 검색돼요.</Text>
      <View style={s.actions}><Button compact label="전체 여행자 보기" onPress={()=>{setQuery('');void search('');}} disabled={searching} secondary/><Button compact label="여행자 목록 새로고침" onPress={()=>void search(lastQuery,offset)} disabled={searching} secondary/></View>
      <Text accessibilityRole="header" style={s.friendSectionTitle}>{lastQuery.trim()?'검색 결과':'전체 여행자'}</Text>
      {searching&&<ActivityIndicator color={c.sea} accessibilityLabel="여행자 검색 중"/>}{!!searchError&&<Notice error>{searchError}</Notice>}
      {!searched&&!searching&&<Notice>빈 검색어로 공개 여행자를 둘러볼 수 있어요.</Notice>}
      {searched&&!searching&&!searchError&&!results.length&&<Notice>검색된 여행자가 없어요. 다른 닉네임이나 유저 ID를 입력해 주세요.</Notice>}
      {results.map(profile=>row(profile.id,profile,follows.some(follow=>follow.followee_id===profile.id)))}
      {searched&&<View style={s.actions}>{offset>0&&<Button label="이전 여행자" disabled={searching} onPress={()=>void search(lastQuery,Math.max(0,offset-20))} secondary/>}{more&&<Button label="다음 여행자" disabled={searching} onPress={()=>void search(lastQuery,offset+20)} secondary/>}</View>}
      {owner&&<View style={s.inviteSheet}><Text accessibilityRole="header" style={s.friendSectionTitle}>유저 ID로 초대하기</Text><Text style={s.hint}>같은 닉네임도 유저 ID로 구분해요. 초대는 검색만 열고 요청과 수락은 직접 선택해요.</Text><Text selectable accessibilityLabel="내 초대 링크" style={s.identifier}>{inviteLink}</Text><Button label="초대 링크 공유" disabled={!identity.code} onPress={()=>{void Share.share({message:`여행가봥 친구 초대\n${inviteLink}`}).catch(error=>{if(active.current)setActionError(message(error));});}} secondary/></View>}
    </View></View>}
  </View>;
}

const makeStyles=(c: ThemeColors)=>StyleSheet.create({
  profilePage:{gap:16},
  profileCard:{backgroundColor:c.profile.sheet,padding:20,gap:12},
  profileHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},
  profileTitle:{fontSize:20,lineHeight:28,fontWeight:'700',color:c.profile.ink,flexShrink:1},
  profileIdentity:{flexDirection:'row',alignItems:'center',gap:20},
  profileName:{fontSize:30,lineHeight:42,fontWeight:'700',color:c.profile.ink},
  profileSmall:{fontSize:12,lineHeight:18,color:c.profile.muted,flexShrink:1},
  profileIdentifier:{fontSize:14,lineHeight:21,color:c.profile.ink},
  profileLink:{fontSize:11,lineHeight:17,color:c.profile.accent,flexShrink:1},
  visitLink:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8},
  visitBadge:{width:72,minHeight:64,borderWidth:1,borderStyle:'dashed',borderRadius:36,borderColor:c.profile.accent,backgroundColor:c.profile.tint,alignItems:'center',justifyContent:'center',padding:4},
  visitNumber:{fontSize:16,lineHeight:24,color:c.profile.accent,textAlign:'center'},
  compactButton: {paddingHorizontal:8,paddingVertical:8,borderRadius:10},
  compactButtonText: {fontSize:12,lineHeight:18},
  friendHeading: {flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},
  friendTitle: {fontSize:24,lineHeight:35,fontWeight:'700',color:c.ink},
  friendTabs: {flexDirection:'row',gap:8},
  friendTab: {flex:1,padding:8,gap:6,alignItems:'center',justifyContent:'center'},
  friendTabText: {fontSize:14,lineHeight:21,color:c.ink},
  friendTabLine: {height:3,width:'100%',borderRadius:2,backgroundColor:c.sea},
  friendSectionHeading: {flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},
  friendSectionTitle: {fontSize:13,lineHeight:20,fontWeight:'700',color:c.ink,flexShrink:1},
  friendSheet: {gap:12},
  friendSearch: {flexDirection:'row',alignItems:'center',gap:8},
  friendName: {fontSize:15,lineHeight:22,fontWeight:'700',color:c.ink},
  friendIdentifier: {fontSize:10,lineHeight:15,color:c.muted},
  friendHint: {fontSize:11,lineHeight:17,color:c.muted},
  friendActions: {width:88,flexShrink:0,gap:8},
  anonymousAvatar: {width:48,height:48,borderRadius:24,backgroundColor:c.warm,alignItems:'center',justifyContent:'center'},
  mapLink: {fontSize:12,lineHeight:18,color:c.sea},
  inviteSheet: {paddingVertical:16,gap:12,borderTopWidth:1,borderColor:c.line},
  container: {gap: 16, backgroundColor: c.paper},
  sheet: {backgroundColor: c.sheet, borderWidth: 1, borderColor: c.line, borderRadius: 24, padding: 18, gap: 12},
  title: {color: c.ink, fontSize: 28, fontWeight: '800'},
  sectionTitle: {color: c.ink, fontSize: 21, fontWeight: '700'},
  label: {color: c.ink, fontSize: 16, fontWeight: '600'},
  hint: {color: c.muted, fontSize: 14, lineHeight: 22},
  error: {color: c.error},
  input: {minHeight: 48, padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: 14, color: c.ink, backgroundColor: c.paper, fontSize: 16},
  button: {minHeight: 48, minWidth: 48, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, backgroundColor: c.coral, alignItems: 'center', justifyContent: 'center'},
  secondary: {backgroundColor: c.warm, borderWidth: 1, borderColor: c.line},
  buttonText: {color: c.onPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center'},
  secondaryText: {color: c.ink},
  dim: {opacity: 0.55},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  choice: {minHeight: 48, minWidth: 48, padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10, justifyContent: 'center'},
  selected: {borderColor: c.sea, backgroundColor: c.paper, borderWidth: 2},
  choiceText: {color: c.ink, fontSize: 15},
  toggle: {flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48},
  switch: {minWidth: 48, minHeight: 48},
  flex: {flex: 1, minWidth: 0},
  avatar: {width: 48, height: 48, borderRadius: 24, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center'},
  avatarText: {color: c.sea, fontSize: 20, fontWeight: '700'},
  person: {flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:c.line,paddingVertical:10,gap:12,backgroundColor:c.sheet},
  identity: {flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:12},
  name: {color: c.ink, fontSize: 17, fontWeight: '700'},
  identifier: {color: c.muted, fontSize: 12, marginTop: 4, flexShrink: 1},
});
