const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb+srv://tathagat:tathagat@cluster0.zox2r.mongodb.net/zeba_royal?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  await mongoose.connect(MONGO_URI);
  const user = await User.findOne({ email: "anvorastudio@gmail.com" }); 
  console.log(JSON.stringify(user, null, 2));
  
  if (!user) { console.log('No user'); process.exit(0); }

  const isProfileComplete = (() => {
    if (!user.personalInfo || !user.address || !user.education || !user.testScores) return {res: false, reason: 'missing main section'};
    
    const p = user.personalInfo;
    if (!p.firstName || !p.lastName || !p.dob || !p.firstLanguage || !p.citizenship || !p.maritalStatus || !p.gender) return {res: false, reason: `personal info missing: fn=${p.firstName}, ln=${p.lastName}, dob=${p.dob}, fl=${p.firstLanguage}, cit=${p.citizenship}, ms=${p.maritalStatus}, g=${p.gender}`};
    
    if (!p.passport || !p.passport.number || !p.passport.expiryDate || !p.passport.placeOfBirth) return {res: false, reason: `passport missing`};

    const a = user.address;
    if (!a.street || !a.city || !a.state || !a.country || !a.zipCode || !a.phone) return {res: false, reason: `address missing`};

    if (user.education.length === 0) return {res: false, reason: `education missing`};
    const edu = user.education[0];
    if (!edu.schoolName || !edu.country || !edu.level || !edu.gradingScheme || !edu.score || !edu.language || !edu.attendedFrom || !edu.attendedTo || !edu.degreeName) return {res: false, reason: `education fields missing: sn=${edu.schoolName}, ct=${edu.country}, lvl=${edu.level}, gs=${edu.gradingScheme}, sc=${edu.score}, lang=${edu.language}, af=${edu.attendedFrom}, at=${edu.attendedTo}, dn=${edu.degreeName}`};

    if (!user.testScores.englishProficiency) return {res: false, reason: `english proficiency missing`};

    return {res: true};
  })();

  console.log("Profile Complete:", isProfileComplete);

  process.exit(0);
}

check();
