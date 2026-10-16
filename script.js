// Anti-Inspect 
document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = function(e) {
    if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74 || e.keyCode == 67)) || (e.ctrlKey && e.keyCode == 85)) return false;
};

function goToScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

const langSelect = document.getElementById('lang-select');
const declareChk = document.getElementById('declare-chk');
const btnReady = document.getElementById('btn-ready');
const examLanguageSelect = document.getElementById('exam-language-select');
const pauseBtn = document.getElementById('pause-btn');
const submitSectionBtn = document.getElementById('submit-section-btn');
const mobileViewToggle = document.getElementById('mobile-view-toggle');

function setMobileExamView(showSidebar) {
    const examScreen = document.getElementById('screen-exam');
    examScreen.classList.toggle('mobile-sidebar-view', showSidebar);
    examScreen.classList.toggle('mobile-question-view', !showSidebar);
    mobileViewToggle.innerText = showSidebar ? 'Questions' : 'Overview';
    mobileViewToggle.setAttribute('aria-pressed', String(showSidebar));
}

mobileViewToggle.addEventListener('click', () => {
    setMobileExamView(!document.getElementById('screen-exam').classList.contains('mobile-sidebar-view'));
});

const mobileViewport = window.matchMedia('(max-width: 520px)');
const updateMobileExamView = event => {
    if (event.matches) setMobileExamView(true);
    else document.getElementById('screen-exam').classList.remove('mobile-sidebar-view', 'mobile-question-view');
};
updateMobileExamView(mobileViewport);
mobileViewport.addEventListener('change', updateMobileExamView);

function applyLanguageSelection(value) {
    if (!value) return;
    if (langSelect) langSelect.value = value;
    if (examLanguageSelect) examLanguageSelect.value = value;
}

function checkReadyStatus() {
    btnReady.disabled = !(langSelect.value !== "" && declareChk.checked);
}
langSelect.addEventListener('change', () => { applyLanguageSelection(langSelect.value); checkReadyStatus(); });
declareChk.addEventListener('change', checkReadyStatus);
examLanguageSelect.addEventListener('change', () => {
    applyLanguageSelection(examLanguageSelect.value);
    renderSectionQuestions();
});

// JSON configuration initialized as objects inside the application context
const sectionMeta = [
    { name: 'General Intelligence and Reasoning', total: 25 },
    { name: 'General Awareness', total: 25 },
    { name: 'Quantitative Aptitude', total: 25 },
    { name: 'English Comprehension', total: 25 }
];

const totalQ = 100;
let questions = [];
let currentSectionIndex = 0;
let currentQ = 0;
let sectionResults = [];
let sectionTimes = [];
let sectionPositions = [];
let totalTime = 60 * 60;
let initialTime = 60 * 60;
let sectionStartRemaining = initialTime;
let timerInterval = null;
let isPaused = false;

const questionBank = {
    // Section 0: General Intelligence and Reasoning
    0: [
        {
            textEn: "In a certain code language, 'LIGHT' is coded as 'MJHIU'. How will 'FLAME' be coded in that same language?",
            textHi: "एक निश्चित कूट भाषा में 'LIGHT' को 'MJHIU' लिखा जाता है। उसी भाषा में 'FLAME' को क्या लिखा जाएगा?",
            optionsEn: ["GMANE", "GMBND", "GMBNF", "HMCPE"],
            optionsHi: ["GMANE", "GMBND", "GMBNF", "HMCPE"],
            correct: 2,
            expEn: "Each letter is shifted forward by 1 (+1 in alphabet order): F->G, L->M, A->B, M->N, E->F. Therefore, 'FLAME' becomes 'GMBNF'.",
            expHi: "प्रत्येक अक्षर वर्णमाला में 1 स्थान आगे बढ़ता है (+1): F->G, L->M, A->B, M->N, E->F. अतः 'GMBNF' सही उत्तर है।"
        },
        {
            textEn: "Find the missing number in the following series: 3, 7, 15, 31, 63, ?",
            textHi: "निम्नलिखित श्रृंखला में लुप्त संख्या ज्ञात कीजिए: 3, 7, 15, 31, 63, ?",
            optionsEn: ["127", "125", "129", "131"],
            optionsHi: ["127", "125", "129", "131"],
            correct: 0,
            expEn: "The pattern is (Previous Number × 2) + 1: (3×2)+1=7, (7×2)+1=15, (15×2)+1=31, (31×2)+1=63, (63×2)+1 = 127.",
            expHi: "श्रृंखला का नियम (संख्या × 2) + 1 है: (63 × 2) + 1 = 127।"
        },
        {
            textEn: "Select the related word from the given alternatives: Book : Author :: Statue : ?",
            textHi: "दिए गए विकल्पों में से संबंधित शब्द का चयन कीजिए: पुस्तक : लेखक :: मूर्ति : ?",
            optionsEn: ["Painter", "Sculptor", "Mason", "Architect"],
            optionsHi: ["चित्रकार", "मूर्तिकार", "राजमिस्त्री", "वास्तुकार"],
            correct: 1,
            expEn: "Just as an Author writes/creates a Book, a Sculptor carves/creates a Statue.",
            expHi: "जिस प्रकार लेखक पुस्तक की रचना करता है, उसी प्रकार मूर्तिकार मूर्ति का निर्माण करता है।"
        },
        {
            textEn: "Statements: All roses are flowers. Some flowers are red. Conclusions: I. Some roses are red. II. All red things are flowers.",
            textHi: "कथन: सभी गुलाब फूल हैं। कुछ फूल लाल हैं। निष्कर्ष: I. कुछ गुलाब लाल हैं। II. सभी लाल चीजें फूल हैं।",
            optionsEn: ["Only conclusion I follows", "Only conclusion II follows", "Both follow", "Neither I nor II follows"],
            optionsHi: ["केवल निष्कर्ष I अनुसरण करता है", "केवल निष्कर्ष II अनुसरण करता है", "दोनों अनुसरण करते हैं", "न तो I और न ही II अनुसरण करता है"],
            correct: 3,
            expEn: "There is no direct relationship established between roses and red objects. Also not all red things are flowers. Hence neither follows.",
            expHi: "गुलाब और लाल के बीच कोई निश्चित संबंध नहीं है। अतः न तो I और न ही II अनुसरण करता है।"
        },
        {
            textEn: "Pointing to a man, a woman said, 'His mother is the only daughter of my mother.' How is the woman related to the man?",
            textHi: "एक पुरुष की ओर इशारा करते हुए एक महिला ने कहा, 'उसकी माँ मेरी माँ की इकलौती बेटी है।' वह महिला उस पुरुष से किस प्रकार संबंधित है?",
            optionsEn: ["Mother", "Sister", "Aunt", "Daughter"],
            optionsHi: ["माँ", "बहन", "मौसी/चाची", "बेटी"],
            correct: 0,
            expEn: "The only daughter of the woman's mother is the woman herself. Therefore, she is the man's Mother.",
            expHi: "महिला की माँ की इकलौती बेटी स्वयं वह महिला है। अतः वह उस पुरुष की माँ है।"
        }
    ],
    // Section 1: General Awareness
    1: [
        {
            textEn: "Which Article of the Constitution of India guarantees the 'Right to Equality before Law'?",
            textHi: "भारतीय संविधान का कौन सा अनुच्छेद 'विधि के समक्ष समानता' का अधिकार सुनिश्चित करता है?",
            optionsEn: ["Article 14", "Article 19", "Article 21", "Article 32"],
            optionsHi: ["अनुच्छेद 14", "अनुच्छेद 19", "अनुच्छेद 21", "अनुच्छेद 32"],
            correct: 0,
            expEn: "Article 14 of the Indian Constitution provides that the State shall not deny to any person equality before the law or equal protection of laws.",
            expHi: "भारतीय संविधान का अनुच्छेद 14 विधि के समक्ष समानता और विधियों के समान संरक्षण का अधिकार देता है।"
        },
        {
            textEn: "The famous Kaziranga National Park, known worldwide for the one-horned rhinoceros, is located in which Indian state?",
            textHi: "एक सींग वाले गैंडे के लिए विश्व प्रसिद्ध काजीरंगा राष्ट्रीय उद्यान किस भारतीय राज्य में स्थित है?",
            optionsEn: ["West Bengal", "Assam", "Odisha", "Madhya Pradesh"],
            optionsHi: ["पश्चिम बंगाल", "असम", "ओडिशा", "मध्य प्रदेश"],
            correct: 1,
            expEn: "Kaziranga National Park is a UNESCO World Heritage site situated in Assam, India.",
            expHi: "काजीरंगा राष्ट्रीय उद्यान भारत के असम राज्य में स्थित एक यूनेस्को विश्व धरोहर स्थल है।"
        },
        {
            textEn: "Which planet in our solar system is commonly referred to as the 'Red Planet'?",
            textHi: "हमारे सौरमंडल में किस ग्रह को सामान्यतः 'लाल ग्रह' कहा जाता है?",
            optionsEn: ["Venus", "Mercury", "Mars", "Jupiter"],
            optionsHi: ["शुक्र", "बुध", "मंगल", "बृहस्पति"],
            correct: 2,
            expEn: "Mars is known as the Red Planet because the iron oxide prevalent on its surface gives it a reddish appearance.",
            expHi: "मंगल ग्रह की सतह पर लौह ऑक्साइड (आयरन ऑक्साइड) की प्रचुरता के कारण यह लाल रंग का दिखाई देता है।"
        },
        {
            textEn: "Who among the following was the Chairman of the Drafting Committee of the Constituent Assembly?",
            textHi: "संविधान सभा की प्रारूप समिति (Drafting Committee) के अध्यक्ष निम्नलिखित में से कौन थे?",
            optionsEn: ["Dr. B. R. Ambedkar", "Dr. Rajendra Prasad", "Jawaharlal Nehru", "Sardar Vallabhbhai Patel"],
            optionsHi: ["डॉ. बी. आर. अम्बेडकर", "डॉ. राजेन्द्र प्रसाद", "जवाहरलाल नेहरू", "सरदार वल्लभभाई पटेल"],
            correct: 0,
            expEn: "Dr. Bhimrao Ramji Ambedkar was appointed Chairman of the Drafting Committee on August 29, 1947.",
            expHi: "डॉ. भीमराव अम्बेडकर 29 अगस्त 1947 को प्रारूप समिति के अध्यक्ष नियुक्त किए गए थे।"
        },
        {
            textEn: "Which enzyme present in human saliva helps in the digestion of starch?",
            textHi: "मानव लार में उपस्थित कौन सा एंजाइम स्टार्च के पाचन में सहायता करता है?",
            optionsEn: ["Pepsin", "Amylase (Ptyalin)", "Trypsin", "Lipase"],
            optionsHi: ["पेप्सिन", "एमाइलेज (टायलिन)", "ट्रिप्सिन", "लाइपेस"],
            correct: 1,
            expEn: "Salivary amylase (also called ptyalin) initiates carbohydrate digestion by breaking down starch into maltose.",
            expHi: "लार में पाया जाने वाला एंजाइम एमाइलेज (टायलिन) स्टार्च को माल्टोज शर्करा में तोड़ता है।"
        }
    ],
    // Section 2: Quantitative Aptitude
    2: [
        {
            textEn: "A shopkeeper marks an article at ₹800 and offers a discount of 15%. What is the selling price of the article?",
            textHi: "एक दुकानदार किसी वस्तु पर ₹800 अंकित करता है और 15% की छूट देता है। वस्तु का विक्रय मूल्य क्या है?",
            optionsEn: ["₹660", "₹680", "₹700", "₹720"],
            optionsHi: ["₹660", "₹680", "₹700", "₹720"],
            correct: 1,
            expEn: "Selling Price = Marked Price × (1 - Discount/100) = 800 × 0.85 = ₹680.",
            expHi: "विक्रय मूल्य = अंकित मूल्य × (1 - 15/100) = 800 × 0.85 = ₹680।"
        },
        {
            textEn: "The ratio of two numbers is 4 : 5. If their LCM is 180, what is the smaller number?",
            textHi: "दो संख्याओं का अनुपात 4 : 5 है। यदि उनका ल.स. (LCM) 180 है, तो छोटी संख्या क्या है?",
            optionsEn: ["36", "45", "30", "40"],
            optionsHi: ["36", "45", "30", "40"],
            correct: 0,
            expEn: "Let the numbers be 4x and 5x. LCM = 20x = 180 => x = 9. Smaller number = 4 × 9 = 36.",
            expHi: "माना संख्याएँ 4x और 5x हैं। LCM = 20x = 180 => x = 9। छोटी संख्या = 4 × 9 = 36।"
        },
        {
            textEn: "A train 150 meters long crosses a telegraph post in 9 seconds. What is the speed of the train in km/h?",
            textHi: "150 मीटर लंबी एक रेलगाड़ी एक खंभे को 9 सेकंड में पार करती है। रेलगाड़ी की गति किमी/घंटा में क्या है?",
            optionsEn: ["54 km/h", "60 km/h", "64 km/h", "72 km/h"],
            optionsHi: ["54 किमी/घंटा", "60 किमी/घंटा", "64 किमी/घंटा", "72 किमी/घंटा"],
            correct: 1,
            expEn: "Speed in m/s = 150 / 9 = 50/3 m/s. Speed in km/h = (50/3) × (18/5) = 60 km/h.",
            expHi: "गति m/s में = 150/9 m/s। किमी/घंटे में बदलने पर: (50/3) × (18/5) = 60 किमी/घंटा।"
        },
        {
            textEn: "What will be the compound interest on ₹12,000 for 2 years at 10% per annum compounded annually?",
            textHi: "₹12,000 पर 10% वार्षिक दर से 2 वर्ष का चक्रवृद्धि ब्याज कितना होगा?",
            optionsEn: ["₹2,400", "₹2,520", "₹2,640", "₹2,480"],
            optionsHi: ["₹2,400", "₹2,520", "₹2,640", "₹2,480"],
            correct: 1,
            expEn: "Amount = 12000 × (1.1)^2 = 12000 × 1.21 = ₹14,520. CI = 14520 - 12000 = ₹2,520.",
            expHi: "मिश्रधन = 12000 × (1.1)^2 = ₹14,520। चक्रवृद्धि ब्याज = 14,520 - 12,000 = ₹2,520।"
        },
        {
            textEn: "A and B can complete a work together in 12 days. If A alone can do it in 20 days, how many days will B alone take?",
            textHi: "A और B मिलकर एक काम को 12 दिनों में कर सकते हैं। यदि A अकेला इसे 20 दिनों में कर सकता है, तो B अकेला इसे कितने दिनों में पूरा करेगा?",
            optionsEn: ["24 days", "28 days", "30 days", "36 days"],
            optionsHi: ["24 दिन", "28 दिन", "30 दिन", "36 दिन"],
            correct: 2,
            expEn: "1/B = 1/12 - 1/20 = (5 - 3)/60 = 2/60 = 1/30. B will take 30 days.",
            expHi: "B का 1 दिन का काम = 1/12 - 1/20 = 2/60 = 1/30। अतः B अकेला 30 दिन लेगा।"
        }
    ],
    // Section 3: English Comprehension
    3: [
        {
            textEn: "Select the most appropriate SYNONYM of the given word: 'DILIGENT'",
            textHi: "दिए गए शब्द का सबसे उपयुक्त पर्यायवाची (समानार्थी) चुनिए: 'DILIGENT'",
            optionsEn: ["Lazy", "Hardworking", "Proud", "Careless"],
            optionsHi: ["Lazy", "Hardworking", "Proud", "Careless"],
            correct: 1,
            expEn: "'Diligent' means having or showing care and conscientiousness in one's work or duties. 'Hardworking' is the closest synonym.",
            expHi: "'Diligent' का अर्थ परिश्रमी या मेहनती होता है। अतः 'Hardworking' सही पर्यायवाची है।"
        },
        {
            textEn: "Select the most appropriate ANTONYM of the given word: 'TRANSPARENT'",
            textHi: "दिए गए शब्द का सबसे उपयुक्त विलोम शब्द चुनिए: 'TRANSPARENT'",
            optionsEn: ["Clear", "Lucid", "Opaque", "Vivid"],
            optionsHi: ["Clear", "Lucid", "Opaque", "Vivid"],
            correct: 2,
            expEn: "'Transparent' means allowing light to pass through so that objects behind can be distinctly seen. Its opposite is 'Opaque'.",
            expHi: "'Transparent' का अर्थ पारदर्शी होता है। इसका विपरीतार्थी शब्द 'Opaque' (अपारदर्शी) है।"
        },
        {
            textEn: "Select the correct meaning of the idiom: 'Spill the beans'",
            textHi: "दिए गए मुहावरे का सही अर्थ चुनिए: 'Spill the beans'",
            optionsEn: ["To drop food", "To reveal a secret", "To waste money", "To complete a task"],
            optionsHi: ["To drop food", "To reveal a secret", "To waste money", "To complete a task"],
            correct: 1,
            expEn: "The idiom 'Spill the beans' means to disclose a secret or reveal confidential information prematurely.",
            expHi: "'Spill the beans' का अर्थ रहस्य उजागर करना (to reveal a secret) होता है।"
        },
        {
            textEn: "Identify the segment containing a grammatical error: 'Each of the participants (A) / were given (B) / a certificate of appreciation. (C)'",
            textHi: "उस भाग की पहचान करें जिसमें व्याकरण संबंधी त्रुटि है: 'Each of the participants (A) / were given (B) / a certificate of appreciation. (C)'",
            optionsEn: ["Each of the participants", "were given", "a certificate of appreciation", "No error"],
            optionsHi: ["Each of the participants", "were given", "a certificate of appreciation", "No error"],
            correct: 1,
            expEn: "'Each' is a distributive pronoun that takes a singular verb. The correct phrase is 'was given' instead of 'were given'.",
            expHi: "'Each' एकवचन (singular) होता है, इसलिए यहाँ 'were given' के स्थान पर 'was given' होना चाहिए।"
        },
        {
            textEn: "Select the correctly spelt word from the options below:",
            textHi: "नीचे दिए गए विकल्पों में से सही वर्तनी वाले शब्द का चयन कीजिए:",
            optionsEn: ["Privilege", "Priviledge", "Previlege", "Preveledge"],
            optionsHi: ["Privilege", "Priviledge", "Previlege", "Preveledge"],
            correct: 0,
            expEn: "The correct spelling is 'Privilege' (P-R-I-V-I-L-E-G-E).",
            expHi: "सही वर्तनी 'Privilege' (विशेषाधिकार) है।"
        }
    ]
};

function buildQuestions() {
    questions = [];
    let qNumber = 0;
    sectionMeta.forEach((section, sectionIndex) => {
        const bank = questionBank[sectionIndex] || [];
        for (let i = 1; i <= section.total; i++) {
            qNumber++;
            const template = bank[(i - 1) % bank.length];
            const qVariant = Math.floor((i - 1) / bank.length) + 1;
            const prefixEn = qVariant > 1 ? `[Variant ${qVariant}] ` : '';
            const prefixHi = qVariant > 1 ? `[प्रकार ${qVariant}] ` : '';

            questions.push({
                id: qNumber,
                sectionIndex,
                sectionName: section.name,
                text: prefixEn + template.textEn,
                textHi: prefixHi + template.textHi,
                optionsEn: template.optionsEn,
                optionsHi: template.optionsHi,
                status: 'not-visited',
                selected: null,
                correct: template.correct,
                explanationEn: template.expEn,
                explanationHi: template.expHi
            });
        }
    });
}
buildQuestions();

document.getElementById('section-tabs').addEventListener('click', event => {
    const tab = event.target.closest('a[data-section-index]');
    if (!tab) return;
    event.preventDefault();
    navigateToSection(Number(tab.dataset.sectionIndex));
});

function getLanguageValue() { return examLanguageSelect ? examLanguageSelect.value : 'en'; }

function updateSectionHeader() {
    const section = sectionMeta[currentSectionIndex];
    const paletteHeading = document.querySelector('.palette-section-title');
    if (paletteHeading) paletteHeading.innerText = section.name;
    const tabs = document.getElementById('section-tabs');
    tabs.innerHTML = sectionMeta.map((item, index) => {
        const isCompleted = Boolean(sectionResults[index]);
        const isActive = index === currentSectionIndex;
        const state = isActive ? 'active' : isCompleted ? 'completed' : '';
        const marker = isCompleted ? ' ✓' : '';
        return `<a class="section-tab ${state}" href="#section-${index + 1}" data-section-index="${index}" ${isActive ? 'aria-current="step"' : ''}>${item.name}${marker}</a>`;
    }).join('');

    // Change submit button text if on last section
    submitSectionBtn.innerText = currentSectionIndex === sectionMeta.length - 1 ? "Submit Exam" : "Submit section";
}

function formatTimerDisplay() {
    const hours = String(Math.floor(totalTime / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalTime % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalTime % 60).padStart(2, '0');
    const display = `${hours} : ${minutes} : ${seconds}`;
    document.getElementById('exam-timer').innerText = display;
    document.getElementById('exam-timer-panel').innerText = display;
    return display;
}

function formatClockFromSeconds(seconds) {
    const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${hours} : ${minutes} : ${secs}`;
}

function saveActiveSectionTime() {
    const elapsed = Math.max(0, sectionStartRemaining - totalTime);
    sectionTimes[currentSectionIndex] = (sectionTimes[currentSectionIndex] || 0) + elapsed;
    sectionStartRemaining = totalTime;
}

function animateSectionChange() {
    const examLayout = document.querySelector('#screen-exam .exam-layout');
    examLayout.classList.remove('section-transition');
    void examLayout.offsetWidth;
    examLayout.classList.add('section-transition');
    examLayout.addEventListener('animationend', () => examLayout.classList.remove('section-transition'), { once: true });
}

function navigateToSection(sectionIndex) {
    if (!Number.isInteger(sectionIndex) || sectionIndex < 0 || sectionIndex >= sectionMeta.length || sectionIndex === currentSectionIndex) return;
    sectionPositions[currentSectionIndex] = currentQ;
    saveActiveSectionTime();
    sectionResults[sectionIndex] = null;
    currentSectionIndex = sectionIndex;
    currentQ = sectionPositions[sectionIndex] || 0;
    const sectionQuestions = questions.filter(question => question.sectionIndex === currentSectionIndex);
    if (sectionQuestions[currentQ]?.status === 'not-visited') sectionQuestions[currentQ].status = 'not-answered';
    renderSectionQuestions();
    animateSectionChange();
}

function togglePause() {
    isPaused = !isPaused;
    const screen = document.getElementById('screen-exam');
    const overlay = document.getElementById('pause-overlay');
    pauseBtn.innerText = isPaused ? 'Resume' : 'Pause';
    screen.classList.toggle('paused', isPaused);
    if (overlay) overlay.classList.toggle('visible', isPaused);

    if (isPaused && timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    else if (!isPaused && timerInterval === null) {
        timerInterval = setInterval(() => {
            totalTime--;
            if(totalTime <= 0) { clearInterval(timerInterval); submitFinalSummary(); return; }
            formatTimerDisplay();
        }, 1000);
    }
}
pauseBtn.addEventListener('click', togglePause);

function startExam() {
    goToScreen('screen-exam');
    isPaused = false;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.remove('visible');
    if (pauseBtn) pauseBtn.innerText = 'Pause';
    totalTime = initialTime;
    currentSectionIndex = 0; currentQ = 0;
    sectionTimes = [];
    sectionPositions = [];
    sectionResults = [];
    sectionStartRemaining = totalTime;
    formatTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isPaused) return;
        totalTime--;
        if(totalTime <= 0) { clearInterval(timerInterval); submitFinalSummary(); return; }
        formatTimerDisplay();
    }, 1000);

    const firstQuestion = questions.filter(q => q.sectionIndex === currentSectionIndex)[0];
    if (firstQuestion && firstQuestion.status === 'not-visited') firstQuestion.status = 'not-answered';
    renderSectionQuestions();
}

function renderSectionQuestions() {
    const sectionQuestions = questions.filter(q => q.sectionIndex === currentSectionIndex);
    const q = sectionQuestions[currentQ];
    if (!q) return;

    const language = getLanguageValue();
    document.getElementById('q-num-text').innerText = `Q: ${q.id} / ${totalQ}`;
    document.getElementById('q-text').innerText = language === 'hi' ? q.textHi : q.text;

    const optsContainer = document.getElementById('q-options');
    const options = language === 'hi' ? q.optionsHi : q.optionsEn;
    optsContainer.innerHTML = options.map((opt, i) => `
        <label class="option-lbl">
            <input type="radio" name="opt" onchange="selectOpt(${i})" ${q.selected === i ? 'checked' : ''}> ${opt}
        </label>
    `).join('');

    renderGrid();
    updateSectionHeader();
}

function selectOpt(idx) {
    const q = questions.filter(q => q.sectionIndex === currentSectionIndex)[currentQ];
    if (q) {
        q.selected = idx;
        q.status = 'answered';
        renderGrid();
    }
}

function renderGrid() {
    const grid = document.getElementById('palette-grid');
    grid.innerHTML = '';
    const sectionQuestions = questions.filter(q => q.sectionIndex === currentSectionIndex);
    let stats = { ans:0, notans:0, notvis:0, mark:0, ansmark:0 };

    sectionQuestions.forEach((q, i) => {
        if(q.status === 'answered') stats.ans++;
        else if(q.status === 'not-answered') stats.notans++;
        else if(q.status === 'not-visited') stats.notvis++;
        else if(q.status === 'marked') stats.mark++;
        else if(q.status === 'ans-marked') stats.ansmark++;

        const btn = document.createElement('button');
        btn.className = `shape-btn ${q.status}`;
        btn.innerText = q.id;
        btn.classList.toggle('current-question', i === currentQ);
        
        btn.onclick = () => {
            if(sectionQuestions[i].status === 'not-visited') sectionQuestions[i].status = 'not-answered';
            currentQ = i;
            renderSectionQuestions();
        };
        grid.appendChild(btn);
    });

    document.getElementById('leg-ans').innerText = stats.ans;
    document.getElementById('leg-not-ans').innerText = stats.notans;
    document.getElementById('leg-not-vis').innerText = stats.notvis;
    document.getElementById('leg-mark').innerText = stats.mark;
    document.getElementById('leg-ans-mark').innerText = stats.ansmark;
}

function saveNext() {
    const q = questions.filter(q => q.sectionIndex === currentSectionIndex)[currentQ];
    if (q) { q.status = q.selected !== null ? 'answered' : 'not-answered'; goNext(); }
}

function markNext() {
    const q = questions.filter(q => q.sectionIndex === currentSectionIndex)[currentQ];
    if (q) { q.status = q.selected !== null ? 'ans-marked' : 'marked'; goNext(); }
}

function clearResp() {
    const q = questions.filter(q => q.sectionIndex === currentSectionIndex)[currentQ];
    if (q) { q.selected = null; q.status = 'not-answered'; renderSectionQuestions(); }
}

function goNext() {
    const sectionQuestions = questions.filter(q => q.sectionIndex === currentSectionIndex);
    if (currentQ < sectionQuestions.length - 1) {
        currentQ += 1;
        if(sectionQuestions[currentQ].status === 'not-visited') sectionQuestions[currentQ].status = 'not-answered';
        renderSectionQuestions();
    } else { renderGrid(); }
}

function getSectionStatusCounts(secIdx) {
    const sq = questions.filter(q => q.sectionIndex === secIdx);
    return {
        ans: sq.filter(q => q.status === 'answered').length,
        ansmark: sq.filter(q => q.status === 'ans-marked').length,
        notans: sq.filter(q => q.status === 'not-answered').length,
        mark: sq.filter(q => q.status === 'marked').length,
        notvis: sq.filter(q => q.status === 'not-visited').length
    };
}

function showModal() {
    const section = sectionMeta[currentSectionIndex];
    const s = getSectionStatusCounts(currentSectionIndex);
    document.getElementById('mod-section-name').innerText = section.name;
    document.getElementById('mod-total').innerText = section.total;
    document.getElementById('mod-ans').innerText = s.ans;
    document.getElementById('mod-ans-mark').innerText = s.ansmark;
    document.getElementById('mod-not-ans').innerText = s.notans;
    document.getElementById('mod-mark').innerText = s.mark;
    document.getElementById('mod-not-vis').innerText = s.notvis;
    document.getElementById('mod-effective').innerText = s.ans + s.ansmark;
    const elapsed = (sectionTimes[currentSectionIndex] || 0) + Math.max(0, sectionStartRemaining - totalTime);
    document.getElementById('mod-time').innerText = formatClockFromSeconds(elapsed);
    document.getElementById('modal-summary').style.display = 'flex';
}

function showFinalSummaryModal() {
    const tbody = document.getElementById('final-summary-rows');
    tbody.innerHTML = '';
    if (!sectionResults[currentSectionIndex]) {
        sectionTimes[currentSectionIndex] = (sectionTimes[currentSectionIndex] || 0) + Math.max(0, sectionStartRemaining - totalTime);
        sectionResults[currentSectionIndex] = calculateSectionResult(currentSectionIndex);
    }
    const overall = { ans: 0, ansmark: 0, notans: 0, mark: 0, notvis: 0, effective: 0 };
    const totals = { questions: 0, ans: 0, ansmark: 0, notans: 0, mark: 0, notvis: 0, effective: 0, time: 0 };
    sectionMeta.forEach((sec, idx) => {
        const s = getSectionStatusCounts(idx);
        const effective = s.ans + s.ansmark;
        const timeTaken = sectionTimes[idx] || 0;
        overall.ans += s.ans;
        overall.ansmark += s.ansmark;
        overall.notans += s.notans;
        overall.mark += s.mark;
        overall.notvis += s.notvis;
        overall.effective += effective;
        totals.questions += sec.total;
        totals.ans += s.ans;
        totals.ansmark += s.ansmark;
        totals.notans += s.notans;
        totals.mark += s.mark;
        totals.notvis += s.notvis;
        totals.effective += effective;
        totals.time += timeTaken;
        tbody.innerHTML += `
            <tr>
                <td>${idx + 1}</td>
                <td>${sec.name}</td>
                <td>${sec.total}</td>
                <td>${s.ans}</td>
                <td>${s.ansmark}</td>
                <td>${s.notans}</td>
                <td>${s.mark}</td>
                <td>${s.notvis}</td>
                <td>${effective}</td>
                <td>${formatClockFromSeconds(timeTaken)}</td>
            </tr>
        `;
    });
    document.getElementById('final-answered').innerText = overall.ans;
    document.getElementById('final-ans-marked').innerText = overall.ansmark;
    document.getElementById('final-not-answered').innerText = overall.notans;
    document.getElementById('final-marked').innerText = overall.mark;
    document.getElementById('final-not-visited').innerText = overall.notvis;
    document.getElementById('final-time').innerText = formatClockFromSeconds(initialTime - totalTime);
    document.getElementById('final-summary-total').innerHTML = `
        <tr>
            <td colspan="2">Total</td>
            <td>${totals.questions}</td>
            <td>${totals.ans}</td>
            <td>${totals.ansmark}</td>
            <td>${totals.notans}</td>
            <td>${totals.mark}</td>
            <td>${totals.notvis}</td>
            <td>${totals.effective}</td>
            <td>${formatClockFromSeconds(totals.time)}</td>
        </tr>
    `;
    document.getElementById('modal-final-summary').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function submitCurrentSection() {
    closeModal('modal-summary');
    saveActiveSectionTime();
    sectionPositions[currentSectionIndex] = currentQ;
    sectionResults[currentSectionIndex] = calculateSectionResult(currentSectionIndex);
    const nextIncomplete = sectionMeta.findIndex((section, index) => !sectionResults[index]);
    if (nextIncomplete === -1) {
        showFinalSummaryModal();
        return;
    }
    currentSectionIndex = nextIncomplete;
    currentQ = sectionPositions[nextIncomplete] || 0;
    const nextQuestions = questions.filter(q => q.sectionIndex === currentSectionIndex);
    if (nextQuestions[currentQ]?.status === 'not-visited') nextQuestions[currentQ].status = 'not-answered';
    renderSectionQuestions();
    animateSectionChange();
}

function calculateSectionResult(sectionIndex) {
    const section = sectionMeta[sectionIndex];
    const sectionQuestions = questions.filter(question => question.sectionIndex === sectionIndex);
    const attempted = sectionQuestions.filter(question => question.selected !== null);
    const correct = attempted.filter(question => question.selected === question.correct).length;
    const counts = getSectionStatusCounts(sectionIndex);
    return {
        name: section.name,
        total: section.total,
        answered: counts.ans,
        answeredMarked: counts.ansmark,
        notAnswered: counts.notans,
        marked: counts.mark,
        notVisited: counts.notvis,
        unseen: counts.notvis,
        effectiveAttempts: counts.ans + counts.ansmark,
        attempted: attempted.length,
        correct,
        incorrect: attempted.length - correct,
        skipped: sectionQuestions.length - attempted.length - counts.notvis,
        score: Number((correct * 2 - (attempted.length - correct) * 0.5).toFixed(1)),
        time: sectionTimes[sectionIndex] || 0
    };
}

function submitFinalSummary() {
    closeModal('modal-summary');
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    showFinalSummaryModal();
}

function submitExam() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    saveActiveSectionTime();
    
    // Ensure all sections have evaluated results
    sectionMeta.forEach((_, idx) => {
        if (!sectionResults[idx]) {
            sectionResults[idx] = calculateSectionResult(idx);
        }
    });

    closeModal('modal-final-summary');
    closeModal('modal-summary');

    // Render complete scorecard and navigate
    renderScorecard();
    goToScreen('screen-scorecard');

    const scrollContainer = document.querySelector('.scorecard-content-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;
}

let currentReviewFilter = 'all'; // 'all', 'negative', 'correct', 'skipped'
let currentReviewSection = 'all'; // 'all', '0', '1', '2', '3'

function renderScorecard() {
    // Current date format
    const today = new Date();
    const dateFormatted = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const dateElem = document.getElementById('sc-date-text');
    if (dateElem) dateElem.innerText = dateFormatted;

    // Time spent
    const elapsedSeconds = Math.max(0, initialTime - totalTime);
    const timeSpentElem = document.getElementById('sc-time-spent');
    if (timeSpentElem) timeSpentElem.innerText = formatClockFromSeconds(elapsedSeconds);

    // Global Stats calculation
    const totalAttempted = questions.filter(q => q.selected !== null).length;
    const correctCount = questions.filter(q => q.selected !== null && q.selected === q.correct).length;
    const incorrectCount = questions.filter(q => q.selected !== null && q.selected !== q.correct).length;
    const skippedCount = totalQ - totalAttempted;

    const positiveMarks = correctCount * 2.0;
    const negativeDeduction = incorrectCount * 0.5;
    const netScore = Number((positiveMarks - negativeDeduction).toFixed(2));
    const accuracy = totalAttempted > 0 ? ((correctCount / totalAttempted) * 100).toFixed(1) : '0.0';
    const scorePercent = ((netScore / 200) * 100).toFixed(1);
    const lossRatio = positiveMarks > 0 ? ((negativeDeduction / positiveMarks) * 100).toFixed(1) : '0.0';

    // Percentile & Rank
    const percentile = totalAttempted > 0 
        ? Math.min(99.9, Math.max(1.0, Number(((netScore / 200) * 88 + 10).toFixed(1)))) 
        : 0.0;
    const rank = totalAttempted > 0 
        ? Math.max(1, Math.round(2500 * (1 - (percentile / 100)))) 
        : '--';

    // Populate Key Metrics
    const netScoreElem = document.getElementById('sc-net-score');
    if (netScoreElem) netScoreElem.innerText = netScore.toFixed(2);

    const scorePercentElem = document.getElementById('sc-score-percent');
    if (scorePercentElem) scorePercentElem.innerText = `${scorePercent}% of maximum marks (200)`;

    const posMarksElem = document.getElementById('sc-positive-marks');
    if (posMarksElem) posMarksElem.innerText = positiveMarks.toFixed(2);

    const correctCountElem = document.getElementById('sc-correct-count');
    if (correctCountElem) correctCountElem.innerText = correctCount;

    const negMarksElem = document.getElementById('sc-negative-marks');
    if (negMarksElem) negMarksElem.innerText = negativeDeduction.toFixed(2);

    const incorrectCountElem = document.getElementById('sc-incorrect-count');
    if (incorrectCountElem) incorrectCountElem.innerText = incorrectCount;

    const accuracyElem = document.getElementById('sc-accuracy');
    if (accuracyElem) accuracyElem.innerText = `${accuracy}%`;

    const attemptedCountElem = document.getElementById('sc-attempted-count');
    if (attemptedCountElem) attemptedCountElem.innerText = totalAttempted;

    const percentileElem = document.getElementById('sc-percentile');
    if (percentileElem) percentileElem.innerText = `${percentile}%`;

    const rankElem = document.getElementById('sc-rank');
    if (rankElem) rankElem.innerText = rank;

    // Negative Marking Spotlight Banner
    const bannerExplanation = document.getElementById('neg-banner-explanation');
    if (bannerExplanation) {
        bannerExplanation.innerHTML = `You attempted <strong>${incorrectCount} questions</strong> incorrectly, resulting in a direct penalty deduction of <strong style="color: #dc2626;">-${negativeDeduction.toFixed(2)} marks</strong> (-0.50 marks per wrong answer). Without negative marking penalties, your gross score would have been <strong style="color: #059669;">+${positiveMarks.toFixed(2)} / 200</strong>. Your overall accuracy is <strong>${accuracy}%</strong>.`;
    }
    const chipGrossElem = document.getElementById('chip-gross-score');
    if (chipGrossElem) chipGrossElem.innerText = `+${positiveMarks.toFixed(2)}`;

    const chipPenElem = document.getElementById('chip-penalty');
    if (chipPenElem) chipPenElem.innerText = `-${negativeDeduction.toFixed(2)}`;

    const chipNetElem = document.getElementById('chip-net-score');
    if (chipNetElem) chipNetElem.innerText = netScore.toFixed(2);

    const chipRatioElem = document.getElementById('chip-loss-ratio');
    if (chipRatioElem) chipRatioElem.innerText = `${lossRatio}%`;

    const btnNegCountElem = document.getElementById('btn-neg-count');
    if (btnNegCountElem) btnNegCountElem.innerText = incorrectCount;

    // Section-wise Breakdown Table
    const tbody = document.getElementById('sc-section-rows');
    const tfoot = document.getElementById('sc-section-totals');
    if (tbody && tfoot) {
        tbody.innerHTML = '';
        const secTotals = { total: 0, attempted: 0, correct: 0, incorrect: 0, skipped: 0, positive: 0, negative: 0, net: 0 };

        sectionMeta.forEach((sec, idx) => {
            const secQuestions = questions.filter(q => q.sectionIndex === idx);
            const attempted = secQuestions.filter(q => q.selected !== null);
            const correct = attempted.filter(q => q.selected === q.correct).length;
            const incorrect = attempted.length - correct;
            const skipped = secQuestions.length - attempted.length;
            const pos = correct * 2.0;
            const neg = incorrect * 0.5;
            const net = Number((pos - neg).toFixed(2));
            const acc = attempted.length > 0 ? ((correct / attempted.length) * 100).toFixed(1) : '0.0';

            secTotals.total += secQuestions.length;
            secTotals.attempted += attempted.length;
            secTotals.correct += correct;
            secTotals.incorrect += incorrect;
            secTotals.skipped += skipped;
            secTotals.positive += pos;
            secTotals.negative += neg;
            secTotals.net += net;

            tbody.innerHTML += `
                <tr>
                    <td style="text-align: left; font-weight: 600; padding-left: 14px;">${idx + 1}. ${sec.name}</td>
                    <td>${secQuestions.length}</td>
                    <td><strong>${attempted.length}</strong></td>
                    <td style="color: #059669; font-weight: 700;">${correct}</td>
                    <td style="color: #dc2626; font-weight: 700;">${incorrect}</td>
                    <td style="color: #64748b;">${skipped}</td>
                    <td style="color: #059669; font-weight: 700;">+${pos.toFixed(2)}</td>
                    <td class="td-negative">-${neg.toFixed(2)}</td>
                    <td class="td-net">${net.toFixed(2)}</td>
                    <td><strong>${acc}%</strong></td>
                </tr>
            `;
        });

        const overallSecAcc = secTotals.attempted > 0 ? ((secTotals.correct / secTotals.attempted) * 100).toFixed(1) : '0.0';
        tfoot.innerHTML = `
            <tr>
                <td style="text-align: left; padding-left: 14px;">Total Summary (4 Sections)</td>
                <td>${secTotals.total}</td>
                <td>${secTotals.attempted}</td>
                <td style="color: #059669;">${secTotals.correct}</td>
                <td style="color: #dc2626;">${secTotals.incorrect}</td>
                <td style="color: #64748b;">${secTotals.skipped}</td>
                <td style="color: #059669;">+${secTotals.positive.toFixed(2)}</td>
                <td class="td-negative">-${secTotals.negative.toFixed(2)}</td>
                <td class="td-net">${secTotals.net.toFixed(2)}</td>
                <td>${overallSecAcc}%</td>
            </tr>
        `;
    }

    // Filter counts update
    const fAll = document.getElementById('count-filter-all');
    if (fAll) fAll.innerText = totalQ;
    const fNeg = document.getElementById('count-filter-negative');
    if (fNeg) fNeg.innerText = incorrectCount;
    const fCor = document.getElementById('count-filter-correct');
    if (fCor) fCor.innerText = correctCount;
    const fSkip = document.getElementById('count-filter-skipped');
    if (fSkip) fSkip.innerText = skippedCount;

    // Render palette and questions
    renderReviewPalette();
    renderReviewQuestions();
}

function renderReviewPalette() {
    const grid = document.getElementById('review-palette-grid');
    if (!grid) return;
    grid.innerHTML = '';

    questions.forEach(q => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'r-chip';
        btn.innerText = q.id;

        if (q.selected === null) {
            btn.classList.add('skipped');
            btn.title = `Q${q.id}: Unattempted (0.0 Marks)`;
        } else if (q.selected === q.correct) {
            btn.classList.add('correct');
            btn.title = `Q${q.id}: Correct (+2.0 Marks)`;
        } else {
            btn.classList.add('incorrect');
            btn.title = `Q${q.id}: Negative Marked (-0.5 Marks Deducted)`;
        }

        btn.onclick = () => jumpToReviewQuestion(q.id);
        grid.appendChild(btn);
    });
}

function renderReviewQuestions() {
    const list = document.getElementById('review-questions-list');
    if (!list) return;
    list.innerHTML = '';

    const reviewLangSelect = document.getElementById('review-language-select');
    const lang = reviewLangSelect ? reviewLangSelect.value : 'en';

    // Filter list
    let filtered = questions.slice();

    if (currentReviewSection !== 'all') {
        const secIdx = Number(currentReviewSection);
        filtered = filtered.filter(q => q.sectionIndex === secIdx);
    }

    if (currentReviewFilter === 'negative') {
        filtered = filtered.filter(q => q.selected !== null && q.selected !== q.correct);
    } else if (currentReviewFilter === 'correct') {
        filtered = filtered.filter(q => q.selected !== null && q.selected === q.correct);
    } else if (currentReviewFilter === 'skipped') {
        filtered = filtered.filter(q => q.selected === null);
    }

    if (filtered.length === 0) {
        let msg = "No questions match the current filter criteria.";
        if (currentReviewFilter === 'negative') {
            msg = "🎉 Great job! No negative marking incurred in this selection.";
        }
        list.innerHTML = `<div class="no-matching-q">${msg}</div>`;
        return;
    }

    const optLetters = ["A", "B", "C", "D"];

    filtered.forEach(q => {
        const isAttempted = q.selected !== null;
        const isCorrect = isAttempted && q.selected === q.correct;
        const isIncorrect = isAttempted && q.selected !== q.correct;

        let cardStatusClass = 'status-card-skipped';
        let badgeHtml = '<span class="review-q-badge badge-unattempted-skipped">⚪ Not Attempted (0.00 Marks)</span>';

        if (isCorrect) {
            cardStatusClass = 'status-card-correct';
            badgeHtml = '<span class="review-q-badge badge-positive-earned">✅ Correct (+2.00 Marks Awarded)</span>';
        } else if (isIncorrect) {
            cardStatusClass = 'status-card-incorrect';
            badgeHtml = '<span class="review-q-badge badge-negative-marked">❌ Negative Marked: -0.50 Marks Deducted</span>';
        }

        const qText = lang === 'hi' ? q.textHi : q.text;
        const options = lang === 'hi' ? q.optionsHi : q.optionsEn;
        const explanation = lang === 'hi' ? q.explanationHi : q.explanationEn;

        const optionsHtml = options.map((opt, optIdx) => {
            let optClass = 'review-opt';
            let tagHtml = '';

            const isThisCorrect = optIdx === q.correct;
            const isThisUser = optIdx === q.selected;

            if (isThisCorrect && isThisUser) {
                optClass += ' opt-correct';
                tagHtml = '<span class="review-opt-status-tag tag-user-correct">✔ Your Choice (Correct! +2.00)</span>';
            } else if (isThisCorrect) {
                optClass += ' opt-correct';
                tagHtml = '<span class="review-opt-status-tag tag-correct-answer">✔ Correct Answer</span>';
            } else if (isThisUser) {
                optClass += ' opt-user-wrong';
                tagHtml = '<span class="review-opt-status-tag tag-user-wrong">✖ Your Choice (-0.50 Negative Deduction)</span>';
            }

            return `
                <div class="${optClass}">
                    <div class="review-opt-left">
                        <span class="review-opt-prefix">${optLetters[optIdx]}</span>
                        <span>${opt}</span>
                    </div>
                    ${tagHtml}
                </div>
            `;
        }).join('');

        const candidateChoiceText = isAttempted ? `Option ${optLetters[q.selected]}` : 'Not Attempted';
        const correctChoiceText = `Option ${optLetters[q.correct]}`;

        let penaltyCallout = '';
        if (isIncorrect) {
            penaltyCallout = `
                <div class="review-penalty-callout">
                    ⚠️ Negative Marking Penalty Applied: You selected <strong>${candidateChoiceText}</strong> instead of <strong>${correctChoiceText}</strong>. A deduction of <strong>-0.50 marks</strong> was subtracted from your total score for this question.
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = `review-q-card ${cardStatusClass}`;
        card.id = `review-q-${q.id}`;
        card.innerHTML = `
            <div class="review-q-header">
                <div class="review-q-left">
                    <span class="review-q-num">Question ${q.id} of ${totalQ}</span>
                    <span class="review-q-sec-tag">${q.sectionName}</span>
                </div>
                <div>${badgeHtml}</div>
            </div>
            <div class="review-q-text">${qText}</div>
            <div class="review-q-options">${optionsHtml}</div>
            <div class="review-explanation-box">
                <div class="review-exp-header">
                    <span>💡 Solution & Performance Summary</span>
                </div>
                <div style="margin-bottom: 6px; color: #475569;">
                    <span>Candidate Choice: <strong>${candidateChoiceText}</strong></span> • 
                    <span>Correct Answer: <strong style="color: #059669;">${correctChoiceText}</strong></span> • 
                    <span>Marks: <strong>${isCorrect ? '+2.00' : isIncorrect ? '-0.50' : '0.00'}</strong></span>
                </div>
                <div>${explanation || 'Standard syllabus rule applies to this question.'}</div>
                ${penaltyCallout}
            </div>
        `;
        list.appendChild(card);
    });
}

function setReviewFilter(filter) {
    currentReviewFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderReviewQuestions();
}

function filterReviewQuestions(filter) {
    setReviewFilter(filter);
    const reviewSection = document.getElementById('test-review-section');
    if (reviewSection) {
        reviewSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function setSectionFilter(secVal) {
    currentReviewSection = secVal;
    renderReviewQuestions();
}

function changeReviewLanguage(lang) {
    const reviewLangSelect = document.getElementById('review-language-select');
    if (reviewLangSelect) reviewLangSelect.value = lang;
    renderReviewQuestions();
}

function jumpToReviewQuestion(qId) {
    const targetQ = questions.find(q => q.id === qId);
    if (!targetQ) return;

    // Check if current section filter excludes this question
    if (currentReviewSection !== 'all' && Number(currentReviewSection) !== targetQ.sectionIndex) {
        currentReviewSection = 'all';
        const secFilterElem = document.getElementById('review-section-filter');
        if (secFilterElem) secFilterElem.value = 'all';
    }

    // Check if current status filter excludes this question
    const isNegative = targetQ.selected !== null && targetQ.selected !== targetQ.correct;
    const isCorrect = targetQ.selected !== null && targetQ.selected === targetQ.correct;
    const isSkipped = targetQ.selected === null;

    if (
        (currentReviewFilter === 'negative' && !isNegative) ||
        (currentReviewFilter === 'correct' && !isCorrect) ||
        (currentReviewFilter === 'skipped' && !isSkipped)
    ) {
        setReviewFilter('all');
    } else {
        renderReviewQuestions();
    }

    setTimeout(() => {
        const elem = document.getElementById(`review-q-${qId}`);
        if (elem) {
            elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            elem.style.outline = '3px solid #1b5a90';
            setTimeout(() => { elem.style.outline = 'none'; }, 1500);
        }
    }, 100);
}

function printScorecard() {
    window.print();
}

function restartExam() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    buildQuestions();
    currentSectionIndex = 0;
    currentQ = 0;
    sectionTimes = [];
    sectionPositions = [];
    sectionResults = [];
    totalTime = initialTime;
    sectionStartRemaining = totalTime;
    isPaused = false;

    // Reset modals & buttons
    const finalSubmitBtn = document.getElementById('btn-final-submit');
    if (finalSubmitBtn) {
        finalSubmitBtn.disabled = false;
        finalSubmitBtn.innerText = 'Submit & View Scorecard';
    }
    const finalSubmitMessage = document.getElementById('final-submit-message');
    if (finalSubmitMessage) {
        finalSubmitMessage.innerText = 'Are you sure you want to submit your mock test and view your scorecard?';
    }

    formatTimerDisplay();
    goToScreen('screen-inst1');
}