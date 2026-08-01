# MrHaile.com - LMS & Digital Asset Hub Architecture

እነሆ ለ **MrHaile.com (LMS & Digital Asset Hub)** የተዘጋጀ **የላቀ (Advanced) እና ጥልቅ ቴክናሎጂያዊ ማብራሪያ** (በአማርኛ እና በቴክኒክ ቋንቋ)፡

---

### የ MrHaile.com የዲጂታል ዕቃዎች እና ኮርሶች ማከማቻ ፕላትፎርም (Advanced Architecture & Features)

#### 1. የዲጂታል ዕቃዎች ማከማቻ (Digital Asset Hub) - የላቀ ትርጉም እና አጠቃቀም

* **Stock Footage (ስቶክ ፉቴጆች):** 
  * *ቴክኒክ አጠቃቀም:* በከፍተኛ ጥራት (4K/1080p) የተዘጋጁ የቪዲዮ ክሊፖች ሲሆኑ በ Cloudinary ወይም በ Bunny Storage ዲስክ ውስጥ ይቀመጣሉ። ፈጣሪዎች የራሳቸውን ቪዲዮ ለመደገፍ (B-roll) በሰከንዶች ውስጥ ከፕላትፎርሙ አውርደው ይጠቀሙበታሉ።
* **Audio & Sound Effects - SFX (የድምፅ ውጤቶች እና ሙዚቃ):** 
  * *ቴክኒክ አጠቃቀም:* የድምፅ ፋይሎች (MP3/WAV) ሲሆኑ በሰከንዶች ውስጥ በከፍተኛ ፍጥነት ለተማሪዎችና ኤዲተሮች ይሰራጫሉ። የቪዲዮውን ስሜት (Cinematic Mood) ለማቀናጀት ያገለግላሉ።
* **Presets (ፕሪሴቶች):** 
  * *ቴክኒክ አጠቃቀም:* የ Premiere Pro, After Effects እና DaVinci Resolve ማስተካከያ ፋይሎች (.prfpsd, .cube, .ffx) ናቸው። ተጠቃሚዎች በአንድ ክሊክ ቀለማቸውን እና ኢፌክታቸውን አስተካክለው ስራቸውን በፍጥነት እንዲጨርሱ ያስችላሉ።
* **Overlays (ኦቨርሌዮች):** 
  * *ቴክኒክ አጠቃቀም:* እንደ Light Leaks እና Film Grain ያሉ ግልጽ (Transparent) የቪዲዮ ንብርብሮች ሲሆኑ፣ በሶፍትዌር Blending Modes በመጠቀም ከዋናው ቪዲዮ ጋር ይዋሃዳሉ።
* **Templates (ቴምፕሌቶች):** 
  * *ቴክኒክ አጠቃቀም:* ሙሉ በሙሉ ተሰርተው የሚያልቁ፣ ኤዲት ሊደረጉ የሚችሉ የፕሮጀክት ፋይሎች (Motion Graphics Templates - MOGRT) ናቸው። ተጠቃሚው ጽሁፉን ወይም ምስሉን በመቀየር ብቻ ፕሮፌሽናል አኒሜሽን ያዘጋጃል።

---

#### 2. የ MERN Stack ቴክኖሎጂ አጠቃቀም (System Workflow)

* **Backend (Node.js & Express.js):** 
  * ሁሉንም ጥያቄዎች (API Endpoints) የሚያስተናብር፣ የተጠቃሚዎችን መረጃ (JWT Authentication) የሚያረጋግጥ እና የደህንነት ግድግዳ (Middleware) የሚቆጣጠር አንጎል ነው።
* **Database (MongoDB):** 
  * የተጠቃሚዎችን መረጃ፣ የኮርስ ዝርዝሮችን፣ የትዕዛዝ ታሪክ (Orders) እና የዲጂታል ዕቃዎች መረጃ (Assets) በሰነድ (JSON Documents) መልክ በከፍተኛ ፍጥነት ይይዛል።
* **Video Security (Bunny.net Stream):** 
  * ቪዲዮዎች በሴቨር ላይ ቦታ እንዳይይዙ እና እንዳይሰረቁ በ Bunny.net Stream (HLS Chunking & Domain Restriction) ተጠብቀው ለተማሪዎች በጊዜያዊ ቶከን (Signed URLs) ብቻ ይለቀቃሉ።
* **Payment Gateway (Chapa):** 
  * የኢትዮጵያ ንግድ ባንክን፣ቴሌብር (Telebirr) እና ሌሎች የክፍያ አማራጮችን በማቀናጀት ተማሪዎች ኮርሶችን እና ዲጂታል ዕቃዎችን በአስተማማኝ ሁኔታ እንዲገዙ ያስችላል።
* **Cloud Storage (Cloudinary):** 
  * የኮርስ ሽፋኖችን (Thumbnails) እና የመገለጫ ምስሎችን (Profile Images) በከፍተኛ ፍጥነት በደመና (Cloud) ላይ ያስቀምጣል።
