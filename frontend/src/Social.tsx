import TravelerAvatar from './Avatar';
import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import {ApiError} from './api';
import {api} from './runtime';
import {colors as c} from './theme';

type Props = {session: any; onChanged?: () => void};
type Author = {id: string; display_name: string | null; avatar_url: string | null};
type Follow = {followee_id: string; created_at: string};
const authorFields = 'id,display_name,avatar_url';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function path(table: string, query: Record<string, string>) {
  return `/rest/v1/${table}?${new URLSearchParams(query)}`;
}

function searchPath(value: string, offset = 0) {
  const term = value.trim();
  const query: Record<string, string> = {select: authorFields, order: 'display_name.asc,id.asc', limit: '20', offset: String(offset)};
  if (uuid.test(term)) query.id = `eq.${term}`;
  else if (term) query.display_name = `ilike.*${term.replace(/[\\%_*]/g, '\\$&')}*`;
  return path('public_profiles', query);
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
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다. 다시 시도해 주세요.';
}

function Button({label, onPress, disabled = false, secondary = false}: {label: string; onPress: () => void; disabled?: boolean; secondary?: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={({pressed}) => [s.button, secondary && s.secondary, (disabled || pressed) && s.dim]}>
    <Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text>
  </Pressable>;
}

function Notice({children, error = false}: {children: string; error?: boolean}) {
  return <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[s.hint, error && s.error]}>{children}</Text>;
}

function Avatar({url}: {url: string | null}) {return <TravelerAvatar url={url} size={44}/>;}

export function ProfileEditor(props: Props) {
  return props.session?.user?.id ? <ProfileForm key={props.session.user.id} {...props}/>
    : <View style={s.sheet}><Text accessibilityRole="header" style={s.title}>나의 프로필</Text><Notice>로그인하면 닉네임과 공개 프로필을 설정할 수 있어요. My에서 로그인해 주세요.</Notice></View>;
}

function ProfileForm({session, onChanged}: Props) {
  const owner = session.user.id as string;
  const googleAvatar = typeof session.user.user_metadata?.avatar_url === 'string' ? session.user.user_metadata.avatar_url : null;
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
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
      // 공개 동의 전 기존 Google 사진을 자동 선택하지 않는다.
      setAvatar(rows[0].public_profile_enabled === true ? rows[0].avatar_url ?? null : null);
      setEnabled(rows[0].public_profile_enabled === true);
      setLoaded(true);
    }).catch(error => {if (current) setError(message(error));}).finally(() => {if (current) setLoading(false);});
    return () => {current = false; active.current = false;};
  }, [owner, attempt]);

  async function save() {
    if (savingRef.current || !loaded) return;
    setError(''); setSuccess('');
    let displayName: string;
    try {displayName = nickname(name);} catch (error) {setError(message(error)); return;}
    savingRef.current = true; setSaving(true);
    try {
      const rows = await api.request(path('profiles', {id: `eq.${owner}`, select: 'display_name,avatar_url,public_profile_enabled'}), 'PATCH', {
        display_name: displayName, avatar_url: avatar, public_profile_enabled: enabled,
      });
      if (!rows.length) throw new Error('프로필이 저장되지 않았습니다. 다시 시도해 주세요.');
      if (!active.current) return;
      setName(rows[0].display_name ?? displayName);
      setAvatar(rows[0].avatar_url ?? null);
      setEnabled(rows[0].public_profile_enabled === true);
      setSuccess('프로필을 저장했어요.');
      onChanged?.();
    } catch (error) {if (active.current) setError(message(error));}
    finally {savingRef.current = false; if (active.current) setSaving(false);}
  }

  const disabled = loading || saving || !loaded;
  return <View style={s.sheet}>
    <Text accessibilityRole="header" style={s.title}>나의 프로필</Text>
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
    <Text style={s.hint}>공개하면 닉네임과 선택한 사진을 누구나 보고 검색할 수 있어요. Google 사진은 직접 선택한 경우에만 사용해요.</Text>
    <View style={s.toggle}><Text style={[s.label, s.flex]}>프로필 공개</Text><Switch accessibilityLabel="프로필 공개" style={s.switch} value={enabled} disabled={disabled} onValueChange={value => {setEnabled(value); setSuccess('');}} trackColor={{false: c.line, true: c.sea}}/></View>
    <Text style={s.hint}>프로필을 숨겨도 여행 기록의 공개 범위와 기존 팔로잉은 유지돼요.</Text>
    {!!error && <Notice error>{error}</Notice>}
    {!!success && <Notice>{success}</Notice>}
    {!loaded && !loading && <Button label="프로필 다시 불러오기" onPress={() => setAttempt(value => value + 1)} secondary/>}
    <Button label={saving ? '저장 중…' : '프로필 저장'} onPress={() => void save()} disabled={disabled}/>
  </View>;
}

type FriendsProps = Props & {onMap?: (ownerId: string) => void};
export function Friends(props: FriendsProps) {
  return <FriendsList key={props.session?.user?.id ?? 'guest'} {...props}/>;
}

function FriendsList({session, onChanged, onMap}: FriendsProps) {
  const owner = session?.user?.id as string | undefined;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Author[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [follows, setFollows] = useState<Follow[]>([]);
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
      const rows: Follow[] = await api.request(path('follows', {follower_id: `eq.${owner}`, select: 'followee_id,created_at', order: 'created_at.desc,followee_id.asc'}));
      // 상대가 공개를 해제해도 본인의 관계와 해제 버튼은 남긴다.
      const profiles: Author[] = [];
      for (let i = 0; i < rows.length; i += 20) {
        const ids = rows.slice(i, i + 20).map(row => row.followee_id);
        if (!ids.every(id => uuid.test(id))) throw new Error('팔로잉 정보를 확인하지 못했습니다.');
        profiles.push(...await api.request(path('public_profiles', {select: authorFields, id: `in.(${ids.join(',')})`})));
      }
      if (!active.current || request !== listRequest.current) return;
      setFollows(rows); setAuthors(Object.fromEntries(profiles.map(profile => [profile.id, profile]))); setLoaded(true);
    } catch (error) {if (active.current && request === listRequest.current) setListError(message(error));}
    finally {if (active.current && request === listRequest.current) setLoading(false);}
  }

  useEffect(() => {
    active.current = true;
    void loadFollows();
    return () => {active.current = false; searchRequest.current++; listRequest.current++;};
  }, [owner]);

  async function search(value: string, page = 0) {
    const request = ++searchRequest.current;
    setSearching(true); setSearchError('');
    try {
      const rows: Author[] = await api.request(searchPath(value, page));
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
      if (profile) setAuthors(previous => ({...previous, [target]: profile}));
      setSuccess(remove ? '팔로우를 해제했어요.' : '팔로우했어요. 친구의 공개 여행을 만나보세요.');
      onChanged?.();
    } catch (error) {if (active.current) setActionError(message(error));}
    finally {busyRef.current = false; if (active.current) setBusy(null);}
  }

  function row(id: string, profile: Author | undefined, followed: boolean) {
    return <View key={id} style={s.person}>
      <View style={s.identity}><Avatar url={profile?.avatar_url ?? null}/><View style={s.flex}><Text style={s.name}>{profile?.display_name || '여행자'}</Text><Text selectable style={s.identifier}>{id}</Text>{!profile && <Text style={s.hint}>공개 프로필을 사용하지 않는 여행자</Text>}</View></View>
      <View style={s.actions}>
        {followed && onMap && <Button label="지도 보기" onPress={() => onMap(id)} secondary/>}
        {id === owner ? <Text style={s.hint}>내 프로필</Text> : <Button label={busy === id ? '처리 중…' : followed ? '팔로우 해제' : owner ? '팔로우' : '로그인 후 팔로우'}
          disabled={!owner || !loaded || loading || busy !== null} onPress={() => void toggle(id, followed)} secondary={followed}/>}
      </View>
    </View>;
  }

  return <View style={s.container}>
    <Text accessibilityRole="header" style={s.title}>친구의 여행</Text>
    <Text style={s.hint}>함께 떠나고 싶은 여행자를 찾아보세요. 팔로우하면 공개된 여행을 모아 볼 수 있어요.</Text>
    {!owner && <Notice>공개 프로필은 누구나 찾을 수 있어요. 팔로우와 내 목록을 사용하려면 My에서 로그인해 주세요.</Notice>}
    {!!actionError && <Notice error>{actionError}</Notice>}{!!success && <Notice>{success}</Notice>}
    {owner && <View style={s.sheet}>
      <Text accessibilityRole="header" style={s.sectionTitle}>내가 팔로우한 여행자</Text>
      <Button label={loading ? '목록 불러오는 중…' : '목록 새로고침'} onPress={() => void loadFollows()} disabled={loading || busy !== null} secondary/>
      {loading && <ActivityIndicator color={c.sea} accessibilityLabel="팔로잉 목록 불러오는 중"/>}
      {!!listError && <Notice error>{listError}</Notice>}
      {loaded && !loading && !listError && !follows.length && <Notice>아직 팔로우한 여행자가 없어요. 아래에서 닉네임을 검색해 보세요.</Notice>}
      {follows.map(follow => row(follow.followee_id, authors[follow.followee_id], true))}
    </View>}
    <View style={s.sheet}>
      <Text accessibilityRole="header" style={s.sectionTitle}>여행자 찾기</Text>
      <TextInput accessibilityLabel="공개 여행자 닉네임 또는 사용자 ID" placeholder="닉네임 또는 사용자 ID" placeholderTextColor={c.muted}
        value={query} onChangeText={setQuery} style={s.input} returnKeyType="search" onSubmitEditing={() => void search(query)} autoCapitalize="none"/>
      <Button label={searching ? '검색 중…' : '여행자 검색'} onPress={() => void search(query)} disabled={searching}/>
      {searching && <ActivityIndicator color={c.sea} accessibilityLabel="여행자 검색 중"/>}
      {!!searchError && <Notice error>{searchError}</Notice>}
      {!searched && !searching && <Notice>공개에 동의한 프로필만 검색돼요. 빈 검색어로 공개 여행자를 둘러볼 수 있어요.</Notice>}
      {searched && !searching && !searchError && !results.length && <Notice>검색된 여행자가 없어요. 다른 닉네임이나 사용자 ID를 입력해 주세요.</Notice>}
      {results.map(profile => row(profile.id, profile, follows.some(follow => follow.followee_id === profile.id)))}
      {searched && <View style={s.actions}>
        {offset > 0 && <Button label="이전 검색 결과" disabled={searching} onPress={() => void search(lastQuery, Math.max(0, offset - 20))} secondary/>}
        {more && <Button label="다음 검색 결과" disabled={searching} onPress={() => void search(lastQuery, offset + 20)} secondary/>}
      </View>}
    </View>
  </View>;
}

const s = StyleSheet.create({
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
  person: {borderTopWidth: 1, borderColor: c.line, paddingTop: 16, gap: 12},
  identity: {flexDirection: 'row', alignItems: 'center', gap: 12},
  name: {color: c.ink, fontSize: 17, fontWeight: '700'},
  identifier: {color: c.muted, fontSize: 12, marginTop: 4, flexShrink: 1},
});
