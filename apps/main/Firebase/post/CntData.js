import { getDatabase, onValue, query, ref, update } from 'firebase/database'
import { app } from '@/Firebase/FirebaseClient';

export default function updateViewCnt(num) {
  const db = getDatabase(app);  // 앱 연결
  let cnt = 0;

  const viewcntRef = query(ref(db, `user-posts/numCnt/${num}`)) ; // 클릭한 숫자의 클릭 기록 조회

  onValue(viewcntRef, (snapshot) => {
    cnt = snapshot.val() ?? 0;
  });

  cnt++;
  let updates = {};
  updates[`/user-posts/numCnt/${num}`] = cnt; // 기존 기록에 1을 더한 뒤 업데이트

  update(ref(db), updates); 
}