/* Firebase web-app config for hosts that are not Firebase Hosting (e.g. Cloudflare Pages).
These values are public by design; access is controlled by Firebase security rules and
the Authorized domains list. On Firebase Hosting, auth.js reads /__/firebase/init.json instead. */
(function(){
if(location.hostname!=="typing.bykhmer.com")return;
window.FIREBASE_CONFIG={
apiKey:"AIzaSyC6SJlx3pD0IhTcolPXO_-6MHUtZ77IFYE",
appId:"1:355040744033:web:2323686ed7a42b37d3d020",
authDomain:"modernkhmertyping.firebaseapp.com",
projectId:"modernkhmertyping",
storageBucket:"modernkhmertyping.firebasestorage.app",
messagingSenderId:"355040744033",
measurementId:"G-FZ2BW5X9SN"
};
})();
