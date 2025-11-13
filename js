// Add Firebase SDK in JS Settings first:
// https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js
// https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDY05r-JDBa4hFnaLJxFzwpFnvzrI5sh3s",
  authDomain: "peeple-ae9d6.firebaseapp.com",
  databaseURL: "https://peeple-ae9d6-default-rtdb.firebaseio.com",
  projectId: "peeple-ae9d6",
  storageBucket: "peeple-ae9d6.firebasestorage.app",
  messagingSenderId: "950850001789",
  appId: "1:950850001789:web:eca0e9b9b56170ce0f4a14",
  measurementId: "G-YGHSBKXMLK"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentGroupId = null;
let presenceRef = null;
let currentUser = { name:'Anon', color:'#4b6cb7' };

function escapeHtml(s){
  return (s+'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------------- Emoji Setup ----------------
// Replace URLs below with your Imgur links
const emojiList = [
  { name:'smile', url:'https://imgur.com/a/vs3v4bM' },
  { name:'laugh', url:'https://i.imgur.com/YOUR_LAUGH_IMAGE.png' },
  { name:'heart', url:'https://i.imgur.com/YOUR_HEART_IMAGE.png' }
];

const emojiPicker = document.getElementById('emojiPicker');
emojiList.forEach(e => {
  const img = document.createElement('img');
  img.src = e.url;
  img.alt = e.name;
  img.title = e.name;
  img.onclick = () => { document.getElementById('chatInput').value += `:${e.name}:`; };
  emojiPicker.appendChild(img);
});

function replaceEmojis(text){
  let messageText = text;
  emojiList.forEach(e => {
    const code = `:${e.name}:`;
    const imgTag = `<img src="${e.url}" alt="${e.name}" style="height:20px;width:20px;vertical-align:middle;">`;
    messageText = messageText.split(code).join(imgTag);
  });
  return messageText;
}

// ---------------- Groups & Chat ----------------
function createGroup(){
  const name = document.getElementById('groupName').value;
  const pass = document.getElementById('groupPass').value;
  if(!name || !pass){ alert("Enter name and password"); return; }
  db.ref('groups').push({name, password:pass}).then(g => alert('Group created! ID: '+g.key));
}

function joinGroup(){
  const id = document.getElementById('joinName').value;
  const pass = document.getElementById('joinPass').value;
  const name = document.getElementById('chatName').value || 'Anon';
  const color = document.getElementById('chatColor').value || '#4b6cb7';
  currentUser = { name, color };

  if(!id || !pass){ alert("Enter group ID and password"); return; }
  db.ref('groups/'+id).once('value').then(snap=>{
    if(!snap.exists()){ alert("Group not found"); return; }
    if(snap.val().password !== pass){ alert("Wrong password"); return; }
    currentGroupId = id;
    setupPresence();
    listenChat();
    listenLeaderboard();
    alert("Joined group: "+snap.val().name);
  });
}

function setupPresence(){
  const userId = 'user_'+Math.random().toString(36).substr(2,5);
  presenceRef = db.ref('presence/'+currentGroupId+'/'+userId);
  presenceRef.set({id:userId});
  presenceRef.onDisconnect().remove();
}

function sendMessage(){
  const msg = document.getElementById('chatInput').value;
  const photo = document.getElementById('chatPhoto').value || '';
  if(!msg || !currentGroupId) return;
  db.ref('messages/'+currentGroupId).push({
    user: currentUser.name,
    color: currentUser.color,
    text: msg,
    photo: photo,
    time:Date.now()
  });
  document.getElementById('chatInput').value = '';
  document.getElementById('chatPhoto').value = '';
}

function listenChat(){
  const chatDiv = document.getElementById('chatMessages');
  db.ref('messages/'+currentGroupId).on('value', snap=>{
    chatDiv.innerHTML = '';
    if(!snap.exists()) return;
    Object.values(snap.val()).forEach(m=>{
      const div = document.createElement('div');
      div.className = 'message';
      div.style.background = m.color+'22';
      div.innerHTML = `
        <img src="${escapeHtml(m.photo || 'https://via.placeholder.com/30')}" alt="Profile">
        <div><b>${escapeHtml(m.user)}</b>: ${replaceEmojis(escapeHtml(m.text))}</div>
      `;
      chatDiv.appendChild(div);
    });
    chatDiv.scrollTop = chatDiv.scrollHeight;
  });
}

// ---------------- Leaderboard ----------------
function listenLeaderboard(){
  const leaderboard = document.getElementById('leaderboardList');
  db.ref('groups').once('value').then(snap=>{
    const groups = snap.val() || {};
    const promises = O
