import React, { useState, useEffect, useRef } from 'react';
import { 
  Text, View, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, 
  SafeAreaView, Dimensions, Modal, TextInput, FlatList, 
  Platform, Animated, Easing, RefreshControl, PanResponder, Alert, Keyboard, ActivityIndicator
} from 'react-native';

// --- 🔥 Firebase 라이브러리 ---
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- 🔑 동업자 키 값 (서버 연결) ---
const firebaseConfig = {
  apiKey: "AIzaSyCMG4ku-yN__xRrDTs4GwVPq1m4P8uB6Ug",
  authDomain: "sok-mal.firebaseapp.com",
  projectId: "sok-mal",
  storageBucket: "sok-mal.firebasestorage.app",
  messagingSenderId: "57722700620",
  appId: "1:57722700620:web:91132e24ceed5df6b5c5e9",
  measurementId: "G-43NGDB6WWM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 🎲 자극적인 주제 50가지 (지루함 타파) ---
const RANDOM_TITLES = [
  "📉 비트코인 -5%.. 한강 수온 체크방", "🤫 독서실 귓속말 (ASMR)", "🤬 직장 상사 뒷담화 (익명보장)", 
  "🍜 점심 메뉴 추천 좀.. 결정장애 옴", "👻 실시간 공포썰 (BGM 있음)", "💤 불면증 치료방 (잠올때까지)", 
  "🎤 방구석 노래방! 한 곡 뽑으실 분?", "⚽ 손흥민 골 넣었다!!! 라이브 중계", "💔 전 애인 연락.. 받는다 vs 만다", 
  "💻 개발자 취업/이직 현실 조언", "🐈 고양이 골골송 24시간 스트리밍", "🗳️ 진보 vs 보수, 끝장 토론", 
  "✈️ 일본 여행 일정 좀 봐줘요", "🎮 롤(LoL) 5:5 내전 (티어 무관)", "🍺 혼술하는 사람들끼리 짠~", 
  "🎬 넷플릭스 신작 스포일러 리뷰", "🕯️ 타로 봐드립니다. 복채는 좋아요", "🏋️ 오운완! 헬스장 빌런 목격담", 
  "💸 주식 물린 사람들 위로방", "🤡 아재개그 배틀 (웃으면 강퇴)", "🔥 탕수육 부먹 vs 찍먹 결판", 
  "📚 수능 D-100 공부 자극 쓴소리", "☕ 카페 창업 준비중인데 팁 좀", "🛍️ 명품 오픈런 실시간 현황", 
  "🌌 우주에 끝이 있을까? 심야 철학", "👶 육아 난이도 최상... 살려줘", "🦴 MBTI 맹신론자들 모임 (T 사절)", 
  "🧘 요가/명상 함께해요 (묵언)", "🚓 내 집 앞 주차 시비 조언 좀", "🎄 크리스마스에 할 거 없는 사람",
  "🍔 햄버거 최대 몇 개 가능?", "😱 나 로또 1등 되면 잠수 탄다?", "🚗 첫 차 추천 좀 (사회초년생)",
  "📱 아이폰 vs 갤럭시, 전쟁터", "🤮 숙취 해소법 공유 급함", "💇 머리 망했는데 위로 좀",
  "🎁 여친/남친 선물 추천 (10만원대)", "🏠 자취 꿀팁 전수방", "🐶 강아지가 자꾸 짖어요 ㅠㅠ",
  "⚾ 야구 개막전 승부 예측", "🎓 대학원 갈까 말까 고민중", "💊 영양제 뭐 먹어야 함?",
  "👖 패션 테러리스트 구제방", "🚲 자전거 국토종주 파티 구함", "📷 인스타 감성 사진 찍는 법",
  "🍳 요리 망함.. 살리는 법 좀", "🚬 금연 1일차.. 응원 좀", "🩸 헌혈 인증하면 칭찬해드림",
  "🧟 좀비 사태 터지면 어디로 튐?", "👽 외계인 믿는 사람 모여라"
];

const CATEGORIES = ["FINANCE", "QUIET", "ANGRY", "FOOD", "HORROR", "SLEEP", "SING", "SPORTS", "LOVE", "TECH", "GAME"];

// --- 🎭 감정 닉네임 생성기 ---
const ADJECTIVES = ["우울한", "신난", "배고픈", "분노한", "새벽감성", "로또당첨", "퇴사하고픈", "사랑에빠진", "센치한", "졸린"];
const NOUNS = ["감자", "햄스터", "고양이", "개발자", "직장인", "백수", "호랑이", "토끼", "쿼카", "알파카"];

const getRandomNickname = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

// --- 공통 컴포넌트: 펄스 애니메이션 (복구) ---
const PulseAvatar = ({ uri, color }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1.6, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: false }), 
        Animated.timing(opacityAnim, { toValue: 0, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: false })
      ])
    ).start();
  }, []);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 60, height: 60 }}>
      <Animated.View style={{position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: color, transform: [{ scale: scaleAnim }], opacity: opacityAnim}} />
      <Image source={{ uri }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'white', zIndex:1 }} />
    </View>
  );
};

// --- 메인 앱 시작 ---
export default function App() {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [user, setUser] = useState(null);
  const [myTension, setMyTension] = useState(5.0);
  const [myProfile, setMyProfile] = useState({ name: "나그네", seed: "Me", points: 1000 });
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('DEFAULT');

  // 🔥 초기화
  useEffect(() => {
    signInAnonymously(auth).then(cred => {
      const randomNick = getRandomNickname();
      setMyProfile(prev => ({ ...prev, name: randomNick, seed: cred.user.uid }));
      setUser(cred.user);
    }).catch(e => console.error(e));

    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveRooms = snapshot.docs.map(doc => {
        const data = doc.data();
        let timeAgo = "방금";
        if (data.createdAt) {
          const diff = Date.now() - data.createdAt.toMillis();
          const min = Math.floor(diff / 60000);
          if (min < 1) timeAgo = "방금";
          else if (min < 60) timeAgo = `${min}분 전`;
          else timeAgo = `${Math.floor(min/60)}시간 전`;
        }
        return { id: doc.id, ...data, timeAgo };
      });
      setRooms(liveRooms);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getTheme = (score) => {
    if (score >= 8.5) return { bg: '#2a0a0a', light: '#FF5252', badge: 'HOT', bubble: '#FF5252' };
    if (score >= 6.0) return { bg: '#2a1a0a', light: '#FF9800', badge: 'ACTIVE', bubble: '#FF9800' };
    if (score >= 3.5) return { bg: '#1a0a2a', light: '#E040FB', badge: 'TALK', bubble: '#E040FB' };
    return { bg: '#0a112a', light: '#448AFF', badge: 'CALM', bubble: '#448AFF' };
  };

  const theme = getTheme(myTension);

  // --- 슬라이더 (PanResponder 적용) ---
  const FlatTensionSlider = ({ tension, setTension, theme }) => {
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => handleGesture(evt),
        onPanResponderMove: (evt) => handleGesture(evt),
      })
    ).current;
    const handleGesture = (evt) => {
      const locationX = evt.nativeEvent.locationX || evt.nativeEvent.layerX; 
      const screenWidth = Dimensions.get('window').width;
      const trackWidth = screenWidth - 40; 
      let newScore = (locationX / trackWidth) * 10;
      if (newScore < 0) newScore = 0; if (newScore > 10) newScore = 10;
      setTension(parseFloat(newScore.toFixed(1)));
    };
    return (
      <View style={[styles.flatBox, { borderColor: theme.light }]}>
        <View style={styles.flatHeader}>
          <Text style={[styles.flatLabel, { color: theme.light }]}>TENSION SETTING</Text>
          <Text style={[styles.flatValue, { color: theme.light }]}>{tension}</Text>
        </View>
        <View style={styles.touchArea} {...panResponder.panHandlers}>
          <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${tension * 10}%`, backgroundColor: theme.light }]} />
              <View style={[styles.sliderThumb, { left: `${tension * 10}%` }]} />
          </View>
        </View>
      </View>
    );
  };

  // --- 웹 대응 커스텀 액션 메뉴 (필터 & 알림) ---
  const ActionMenu = ({ visible, onClose, onSelect, type }) => {
    if (!visible) return null;
    return (
      <Modal transparent visible={visible} animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} onPress={onClose} activeOpacity={1}>
          <View style={styles.menuBox}>
            <Text style={styles.menuTitle}>{type === 'FILTER' ? '정렬 기준' : '알림'}</Text>
            {type === 'FILTER' ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => onSelect('TENSION')}>
                  <Text style={styles.menuText}>🔥 텐션 높은 순</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => onSelect('PEOPLE')}>
                  <Text style={styles.menuText}>👥 인원 많은 순</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => onSelect('NEWEST')}>
                  <Text style={styles.menuText}>🔄 최신순 정렬</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{padding:20}}>
                 <Text style={{color:'white', textAlign:'center', marginBottom:20}}>⚡ 랜덤 방 5개가 전세계 서버에 생성되었습니다!</Text>
                 <TouchableOpacity style={styles.menuItem} onPress={onClose}><Text style={styles.menuText}>확인</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // --- 화면 1: 로비 ---
  const Lobby = () => {
    const [isCreateModal, setCreateModal] = useState(false);
    const [isProfileModal, setProfileModal] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuType, setMenuType] = useState('');
    const [newTitle, setNewTitle] = useState('');

    // 🔥 랜덤 5개 생성 (서버 연동)
    const generateRandomRooms = async () => {
      const batch = [];
      const shuffled = [...RANDOM_TITLES].sort(() => 0.5 - Math.random());
      for (let i = 0; i < 5; i++) {
          batch.push(addDoc(collection(db, "rooms"), {
              title: shuffled[i],
              tension: parseFloat((Math.random() * 10).toFixed(1)),
              category: CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)],
              host: `https://api.dicebear.com/7.x/avataaars/png?seed=${Math.random()}`,
              speakers: Math.floor(Math.random() * 10),
              listeners: Math.floor(Math.random() * 100),
              createdAt: serverTimestamp()
          }));
      }
      await Promise.all(batch);
      setMenuType('ALERT'); setMenuVisible(true);
    };

    // 🔍 필터 처리
    const handleFilterSelect = (type) => {
      setMenuVisible(false);
      setFilterMode(type);
      let sorted = [...rooms];
      if (type === 'TENSION') sorted.sort((a, b) => b.tension - a.tension);
      else if (type === 'PEOPLE') sorted.sort((a, b) => b.listeners - a.listeners);
      else sorted.sort((a, b) => b.createdAt - a.createdAt);
      setRooms(sorted);
    };

    const createRoom = async () => {
      if(!newTitle.trim()) return;
      await addDoc(collection(db, "rooms"), {
        title: newTitle, tension: 5.0, category: "CHAT",
        host: `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.uid}`,
        speakers: 1, listeners: 0, createdAt: serverTimestamp()
      });
      setCreateModal(false); setNewTitle('');
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <View><Text style={styles.headerTitle}>SOK-MAL</Text><Text style={styles.headerSubtitle}>by TENtion</Text></View>
          <TouchableOpacity onPress={() => setProfileModal(true)} style={styles.pointsBadge}>
            <Text style={{color:'#FFD700', fontWeight:'bold', marginRight:5, fontSize:12}}>💎 {myProfile.points}</Text>
            <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${myProfile.seed}` }} style={{width:24, height:24, borderRadius:12}} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentPadding}>
          <FlatTensionSlider tension={myTension} setTension={setMyTension} theme={theme} />
          <View style={styles.listHeader}>
             <Text style={styles.sectionTitle}>NOW LIVE ({rooms.length})</Text>
             <View style={{flexDirection:'row', alignItems:'center'}}>
               <TouchableOpacity onPress={generateRandomRooms} style={styles.lightningBtn}><Text style={{color:'#FFD700', fontWeight:'bold'}}>⚡ 랜덤생성</Text></TouchableOpacity>
               <TouchableOpacity onPress={() => { setMenuType('FILTER'); setMenuVisible(true); }}>
                 <Text style={{color: 'white', fontWeight:'bold'}}>{filterMode === 'DEFAULT' ? 'Filter ▾' : 'Sorted ▾'}</Text>
               </TouchableOpacity>
             </View>
          </View>

          {loading ? <ActivityIndicator size="large" color="white" style={{marginTop:50}} /> : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:80}}>
               {rooms.map((room) => {
                  const rTheme = getTheme(room.tension);
                  const isNew = room.timeAgo === "방금" || (room.timeAgo.includes("분") && parseInt(room.timeAgo) < 10);
                  const isHot = room.listeners >= 50;
                  return (
                    <TouchableOpacity key={room.id} activeOpacity={0.9} style={[styles.card, { borderColor: rTheme.light }]} onPress={() => setCurrentRoom(room)}>
                        <View style={styles.cardHeader}>
                          <View style={{flexDirection:'row', gap:5}}>
                             <View style={[styles.badge, { borderColor: rTheme.light }]}><Text style={{color:rTheme.light, fontSize:9, fontWeight:'bold'}}>{room.category}</Text></View>
                             {isNew && <View style={[styles.badge, {backgroundColor:'red', borderColor:'red'}]}><Text style={{color:'white', fontSize:9, fontWeight:'bold'}}>NEW</Text></View>}
                             {isHot && <View style={[styles.badge, {backgroundColor:'#FFD700', borderColor:'#FFD700'}]}><Text style={{color:'black', fontSize:9, fontWeight:'bold'}}>HOT</Text></View>}
                          </View>
                          <Text style={{color:rTheme.light, fontWeight:'900', fontSize:14}}>{room.tension}</Text>
                        </View>
                        <Text style={styles.roomTitle} numberOfLines={2}>{room.title}</Text>
                        <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:10}}>
                            <Text style={{color:'#888', fontSize:11}}>🎤 {room.speakers}  🎧 {room.listeners}</Text>
                            <Text style={{color:'#666', fontSize:11}}>{room.timeAgo}</Text>
                        </View>
                    </TouchableOpacity>
                  );
               })}
            </ScrollView>
          )}
        </View>
        <TouchableOpacity style={styles.fab} onPress={() => setCreateModal(true)}><Text style={{fontSize: 30}}>+</Text></TouchableOpacity>
        <ActionMenu visible={menuVisible} onClose={() => setMenuVisible(false)} type={menuType} onSelect={handleFilterSelect} />

        {/* 모달: 방 만들기 */}
        <Modal visible={isCreateModal} transparent animationType="slide">
          <View style={styles.modalOverlay}><View style={styles.modalBox}>
              <Text style={styles.modalTitle}>대화방 개설</Text>
              <TextInput style={styles.input} placeholder="방 제목 입력" placeholderTextColor="#666" value={newTitle} onChangeText={setNewTitle} />
              <View style={{flexDirection:'row', gap:10}}><TouchableOpacity style={[styles.modalBtn, {backgroundColor:'#333'}]} onPress={()=>setCreateModal(false)}><Text style={{color:'white'}}>취소</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, {backgroundColor:'white'}]} onPress={createRoom}><Text style={{color:'black', fontWeight:'bold'}}>만들기</Text></TouchableOpacity>
              </View>
          </View></View>
        </Modal>

        {/* 모달: 프로필 (백스페이스 방어) */}
        <Modal visible={isProfileModal} transparent animationType="fade">
          <TouchableOpacity activeOpacity={1} onPress={() => setProfileModal(false)} style={styles.modalOverlay}><View style={styles.modalBox} onStartShouldSetResponder={() => true}>
                <Text style={styles.modalTitle}>MY PROFILE</Text>
                <View style={{alignItems:'center', marginBottom:20}}>
                  <Image source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${myProfile.seed}` }} style={{width:80, height:80, borderRadius:40, borderWidth:2, borderColor:'white', marginBottom:10}} />
                  <TextInput style={styles.profileInput} value={myProfile.name} onChangeText={(t)=>setMyProfile({...myProfile, name:t})} />
                </View>
                <Text style={{color:'#FFD700', textAlign:'center', fontSize:20, fontWeight:'bold', marginBottom:20}}>💎 {myProfile.points.toLocaleString()} Point</Text>
                <TouchableOpacity style={[styles.modalBtn, {backgroundColor:'white'}]} onPress={()=>setProfileModal(false)}><Text style={{fontWeight:'bold'}}>저장</Text></TouchableOpacity>
          </View></TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  };

  // --- 화면 2: 방 상세 ---
  const RoomDetail = ({ room, onBack }) => {
    const [chats, setChats] = useState([]);
    const [chatMsg, setChatMsg] = useState('');
    const [voiceMode, setVoiceMode] = useState('NORMAL'); 
    const [targetLang, setTargetLang] = useState('🇰🇷'); 
    const flatListRef = useRef();
    const theme = getTheme(room.tension);

    useEffect(() => {
        const q = query(collection(db, "rooms", room.id, "messages"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setChats(msgs);
        });
        const interval = setInterval(() => {
             const botMsgs = ["반갑습니다~", "목소리 잘 들리나요?", "여기 분위기 좋네요", "통역 기능 켜보세요!"];
             setChats(prev => [...prev, { id: Date.now(), user:'AI Bot', text: botMsgs[Math.floor(Math.random()*botMsgs.length)], isBot: true }]);
        }, 8000);
        return () => { unsubscribe(); clearInterval(interval); }
    }, [room.id]);

    const sendChat = async () => {
      if(!chatMsg.trim()) return;
      const msg = chatMsg; setChatMsg('');
      try { await addDoc(collection(db, "rooms", room.id, "messages"), { text: msg, user: myProfile.name, uid: user?.uid, createdAt: serverTimestamp() }); } catch(e) {}
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.roomHeader}>
            <TouchableOpacity onPress={onBack}><Text style={{color:'white', fontSize:18, fontWeight:'bold'}}>‹ Back</Text></TouchableOpacity>
            <View style={{alignItems:'center'}}><Text style={{color:'white', fontWeight:'bold'}}>{room.title}</Text><Text style={{color:theme.light, fontSize:10}}>Global • {voiceMode}</Text></View>
            <TouchableOpacity onPress={() => {
                const langs = ['🇰🇷','🇺🇸','🇯🇵','🇨🇳','🇹🇼','🇸🇬'];
                setTargetLang(langs[(langs.indexOf(targetLang)+1) % langs.length]);
            }}><Text style={{fontSize:24}}>{targetLang}</Text></TouchableOpacity>
        </View>

        <View style={{flex:1}}>
            <View style={{paddingHorizontal:20, marginTop:10}}>
              <View style={styles.topicCard}><View style={styles.speakerRow}><PulseAvatar uri={room.host} color={theme.light} />
                  <View style={{marginLeft:10}}><Text style={{color:'white', fontWeight:'bold'}}>HOST</Text><Text style={{color:theme.light, fontSize:12}}>말하는 중... (통역 ON)</Text></View>
              </View></View>
              <View style={styles.voiceControl}>
                {['NORMAL', 'HELIUM', 'CAVE', 'ROBOT'].map(mode => (
                  <TouchableOpacity key={mode} onPress={()=>setVoiceMode(mode)} style={[styles.voiceBtn, voiceMode===mode && {backgroundColor:theme.light, borderColor:theme.light}]}>
                    <Text style={[styles.voiceText, voiceMode===mode && {color:'black'}]}>{mode}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.chatContainer}><FlatList ref={flatListRef} data={chats} keyExtractor={item => item.id.toString()}
                renderItem={({item}) => (
                    <View style={[styles.chatBubble, item.uid === user?.uid ? {alignSelf:'flex-end', backgroundColor:theme.bubble} : {alignSelf:'flex-start', backgroundColor:'#333'}]}>
                      {!item.isMe && item.uid !== user?.uid && <Text style={styles.chatUser}>{item.user}</Text>}
                      <Text style={{color:'white', fontSize:14}}>{item.text}</Text>
                    </View>
                )}
                contentContainerStyle={{padding:20}} onContentSizeChange={()=>flatListRef.current?.scrollToEnd()}
              /></View>
        </View>
        <View style={styles.inputArea}><TextInput style={styles.chatInput} value={chatMsg} onChangeText={setChatMsg} onSubmitEditing={sendChat} placeholder="대화 참여 (자동 번역)..." placeholderTextColor="#888" />
            <TouchableOpacity onPress={sendChat} style={[styles.sendBtn, {backgroundColor:theme.light}]}><Text style={{fontWeight:'bold'}}>⬆</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };
  return currentRoom ? <RoomDetail room={currentRoom} onBack={() => setCurrentRoom(null)} /> : <Lobby />;
}

// --- 스타일 (원본 네온 디자인) ---
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: 'white', fontStyle: 'italic' },
  headerSubtitle: { fontSize: 10, color: '#aaa', marginTop: 2 },
  pointsBadge: {flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.1)', paddingHorizontal:10, paddingVertical:5, borderRadius:20},
  contentPadding: { paddingHorizontal: 20, flex: 1 },
  flatBox: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: 15, borderWidth: 1, marginBottom: 20 },
  flatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  flatLabel: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5 },
  flatValue: { fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
  touchArea: { width: '100%', height: 30, justifyContent: 'center' },
  sliderTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 },
  sliderFill: { height: '100%', borderRadius: 3 },
  sliderThumb: { position: 'absolute', top: -7, width: 20, height: 20, backgroundColor: 'white', borderRadius: 10, marginLeft: -10, borderWidth:2, borderColor:'#000' },
  listHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  lightningBtn: {marginRight: 10, backgroundColor:'rgba(255,215,0,0.2)', paddingHorizontal:10, paddingVertical:5, borderRadius:8, borderWidth:1, borderColor:'#FFD700'},
  card: { marginBottom: 12, borderRadius: 18, padding: 18, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  roomTitle: { fontSize: 16, fontWeight: 'bold', color: 'white', lineHeight: 22 },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 8, zIndex:999 },
  roomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  topicCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 20, marginTop: 10 },
  speakerRow: { flexDirection: 'row', alignItems: 'center' },
  voiceControl: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop:10 },
  voiceBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: '#444' },
  voiceText: { color: '#888', fontSize: 10, fontWeight: 'bold' },
  chatContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  chatBubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '80%' },
  chatUser: { color: '#ccc', fontSize: 10, marginBottom: 2, fontWeight:'bold' },
  inputArea: { flexDirection: 'row', padding: 15, backgroundColor: '#111', alignItems:'center' },
  chatInput: { flex: 1, backgroundColor: '#333', color: 'white', borderRadius: 20, paddingHorizontal: 15, height: 40, marginRight: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 300, backgroundColor: '#1A1A1A', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#333', color: 'white', borderRadius: 12, padding: 15, marginBottom: 20 },
  profileInput: { width: '90%', height: 50, backgroundColor: 'white', borderRadius: 12, color: 'black', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  modalBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuBox: { backgroundColor: '#222', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  menuTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#333' },
  menuItem: { padding: 20, borderBottomWidth: 1, borderColor: '#333', alignItems: 'center' },
  menuText: { color: 'white', fontSize: 16 }
});