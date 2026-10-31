/* Dữ liệu có sẵn: dùng khi mất mạng và để trộn với từ tải từ mạng */
(function (g) {
'use strict';

/* Chủ đề. seed = từ có sẵn (en, vi, emoji). kw = từ khóa để lấy thêm từ trên mạng. */
var TOPICS = [
 {key:'animals',vi:'Con vật',icon:'🐱',kw:['animal','pet','zoo'],seed:[['cat','con mèo','🐱'],['dog','con chó','🐶'],['bird','con chim','🐦'],['fish','con cá','🐟'],['duck','con vịt','🦆'],['cow','con bò','🐮'],['pig','con heo','🐷'],['rabbit','con thỏ','🐰']]},
 {key:'fruits',vi:'Trái cây',icon:'🍎',kw:['fruit','orchard'],seed:[['apple','quả táo','🍎'],['banana','quả chuối','🍌'],['orange','quả cam','🍊'],['grape','quả nho','🍇'],['mango','quả xoài','🥭'],['watermelon','quả dưa hấu','🍉'],['pineapple','quả dứa','🍍'],['strawberry','quả dâu','🍓']]},
 {key:'food',vi:'Đồ ăn uống',icon:'🍞',kw:['food','meal','snack'],seed:[['bread','bánh mì','🍞'],['milk','sữa','🥛'],['egg','quả trứng','🥚'],['rice','cơm','🍚'],['cake','bánh ngọt','🍰'],['water','nước','💧'],['pizza','bánh pizza','🍕'],['soup','món súp','🍲']]},
 {key:'colors',vi:'Màu sắc',icon:'🔴',kw:null,seed:[['red','màu đỏ','🔴'],['blue','màu xanh dương','🔵'],['green','màu xanh lá','🟢'],['yellow','màu vàng','🟡'],['orange','màu cam','🟠'],['purple','màu tím','🟣'],['black','màu đen','⚫'],['white','màu trắng','⚪']]},
 {key:'numbers',vi:'Số đếm',icon:'1',kw:null,seed:[['one','số 1','1'],['two','số 2','2'],['three','số 3','3'],['four','số 4','4'],['five','số 5','5'],['six','số 6','6'],['seven','số 7','7'],['eight','số 8','8'],['nine','số 9','9'],['ten','số 10','10']]},
 {key:'family',vi:'Gia đình',icon:'👨‍👩‍👧',kw:['family','relative'],seed:[['mother','mẹ','👩'],['father','bố','👨'],['brother','anh/em trai','👦'],['sister','chị/em gái','👧'],['grandmother','bà','👵'],['grandfather','ông','👴'],['baby','em bé','👶']]},
 {key:'body',vi:'Cơ thể',icon:'👂',kw:['body','face'],seed:[['eye','con mắt','👁️'],['ear','cái tai','👂'],['nose','cái mũi','👃'],['mouth','cái miệng','👄'],['hand','bàn tay','✋'],['foot','bàn chân','🦶'],['leg','cái chân','🦵'],['arm','cánh tay','💪']]},
 {key:'school',vi:'Trường học',icon:'🎒',kw:['school','classroom'],seed:[['book','quyển sách','📖'],['pen','cái bút mực','🖊️'],['pencil','bút chì','✏️'],['bag','cái cặp','🎒'],['ruler','cái thước','📏'],['scissors','cái kéo','✂️'],['clock','đồng hồ','⏰'],['teacher','giáo viên','🧑‍🏫']]},
 {key:'nature',vi:'Thiên nhiên',icon:'☀️',kw:['nature','forest','weather'],seed:[['sun','mặt trời','☀️'],['moon','mặt trăng','🌙'],['star','ngôi sao','⭐'],['rain','mưa','🌧️'],['cloud','đám mây','☁️'],['tree','cái cây','🌳'],['flower','bông hoa','🌸'],['snow','tuyết','❄️']]},
 {key:'clothes',vi:'Quần áo',icon:'👕',kw:['clothes','wear'],seed:[['shirt','áo sơ mi','👕'],['pants','quần dài','👖'],['dress','cái váy','👗'],['hat','cái mũ','🎩'],['shoes','đôi giày','👟'],['socks','đôi tất','🧦'],['coat','áo khoác','🧥'],['scarf','khăn quàng','🧣']]},
 {key:'vehicles',vi:'Phương tiện',icon:'🚗',kw:['vehicle','transport'],seed:[['car','xe ô tô','🚗'],['bus','xe buýt','🚌'],['bike','xe đạp','🚲'],['train','tàu hỏa','🚆'],['plane','máy bay','✈️'],['boat','con thuyền','⛵'],['truck','xe tải','🚚'],['taxi','xe taxi','🚕']]},
 {key:'home',vi:'Ngôi nhà',icon:'🏠',kw:['house','room'],seed:[['house','ngôi nhà','🏠'],['door','cánh cửa','🚪'],['bed','cái giường','🛏️'],['chair','cái ghế','🪑'],['window','cửa sổ','🪟'],['lamp','cái đèn','💡'],['key','chìa khóa','🔑']]},
 {key:'ocean',vi:'Biển',icon:'🌊',kw:['ocean','sea'],seed:null},
 {key:'farm',vi:'Nông trại',icon:'🚜',kw:['farm','barn'],seed:null},
 {key:'insects',vi:'Côn trùng',icon:'🐞',kw:['insect','bug'],seed:null},
 {key:'birds',vi:'Loài chim',icon:'🦜',kw:['bird','feather'],seed:null},
 {key:'flowers',vi:'Hoa và vườn',icon:'🌷',kw:['flower','garden'],seed:null},
 {key:'sports',vi:'Thể thao',icon:'⚽',kw:['sport','game'],seed:null},
 {key:'toys',vi:'Đồ chơi',icon:'🧸',kw:['toy','play'],seed:null},
 {key:'music',vi:'Âm nhạc',icon:'🎵',kw:['music','instrument'],seed:null},
 {key:'jobs',vi:'Nghề nghiệp',icon:'👩‍🚒',kw:['job','work'],seed:null},
 {key:'town',vi:'Phố phường',icon:'🏙️',kw:['town','street'],seed:null},
 {key:'kitchen',vi:'Nhà bếp',icon:'🍳',kw:['kitchen','cook'],seed:null}
];

/* Từ không đưa vào bài học của bé */
var BLOCK = {};
('sex sexy sexual porn nude naked penis vagina breast breasts boob boobs butt ass anus rape murder murderer kill killer killing suicide death dead die dying blood gun guns rifle pistol bomb bombs weapon weapons drug drugs cocaine heroin marijuana weed alcohol beer wine vodka whisky whiskey liquor cigarette cigar tobacco smoke gamble gambling casino poker devil demon hell damn crap shit fuck bitch slut whore corpse grave coffin war army soldier terror terrorist slave abuse prison jail crime criminal thief sperm condom bra thong lingerie stripper erotic fetish orgasm').split(' ').forEach(function(w){BLOCK[w]=1;});

/* Danh từ không đếm được: không dùng a/an hay số nhiều */
var UNCOUNT = {};
('milk water rice bread juice tea coffee sugar salt soup meat cheese butter oil money music snow rain wind weather air fire ice grass sand mud paper glass wood gold silver iron hair fruit food furniture homework luggage news advice information traffic fun time love happiness').split(' ').forEach(function(w){UNCOUNT[w]=1;});

var PLURAL_IRR = {man:'men',woman:'women',child:'children',foot:'feet',tooth:'teeth',mouse:'mice',goose:'geese',person:'people',leaf:'leaves',wolf:'wolves',knife:'knives',wife:'wives',life:'lives',shelf:'shelves',calf:'calves',sheep:'sheep',fish:'fish'};

var PRAISE_VI = ['Giỏi quá!','Tuyệt vời!','Bé làm đúng rồi!','Xuất sắc!','Hay lắm!','Bé thật thông minh!','Đúng rồi, giỏi lắm!','Bé làm tốt lắm!','Quá đỉnh!'];
var PRAISE_EN = ['Great job!','Well done!','Awesome!','Excellent!','Perfect!','Super!','Fantastic!','Good job!','Wonderful!'];

var SENT = [
 ['Hello! My name is Mai.','Xin chào! Tên mình là Mai.'],
 ['How are you? I am fine, thank you.','Bạn khỏe không? Mình khỏe, cảm ơn bạn.'],
 ['What is your name?','Tên bạn là gì?'],
 ['I am seven years old.','Mình bảy tuổi.'],
 ['This is my book.','Đây là quyển sách của mình.'],
 ['Good morning, teacher.','Chào buổi sáng, thưa cô giáo.'],
 ['Thank you very much.','Cảm ơn rất nhiều.'],
 ['See you tomorrow.','Hẹn gặp lại ngày mai.'],
 ['I can jump high.','Mình nhảy được cao.'],
 ['Open your book, please.','Làm ơn mở sách ra.'],
 ['Can I have some water?','Cho mình xin ít nước được không?'],
 ['I love my family.','Mình yêu gia đình mình.'],
 ['Let us play together.','Cùng chơi nhé!'],
 ['What color is it?','Nó màu gì?'],
 ['I go to school every day.','Ngày nào mình cũng đến trường.'],
 ['Good night, Mom.','Chúc mẹ ngủ ngon.']
];

function G(q,a,wrong,tip){return {q:q,a:a,o:[a].concat(wrong),tip:tip};}
var GR = [
 G('I ___ seven years old.','am',['is','are'],'Đi với "I" thì dùng "am".'),
 G('She ___ my sister.','is',['am','are'],'Đi với "she" thì dùng "is".'),
 G('They ___ happy.','are',['is','am'],'Đi với "they" thì dùng "are".'),
 G('We ___ friends.','are',['is','am'],'Đi với "we" thì dùng "are".'),
 G('He ___ a teacher.','is',['are','am'],'Đi với "he" thì dùng "is".'),
 G('You ___ tall.','are',['is','am'],'Đi với "you" thì dùng "are".'),
 G('___ is my pen. (cái này, ở gần)','This',['That'],'"This" chỉ vật ở gần, "that" chỉ vật ở xa.'),
 G('___ is a bird in the tree. (cái kia, ở xa)','That',['This'],'"That" chỉ vật ở xa.'),
 G('My brother is Nam. ___ is eight.','He',['She'],'Nam là con trai nên dùng "he".'),
 G('My mother is kind. ___ name is Lan.','Her',['His'],'Mẹ là nữ nên dùng "her" (của cô ấy).'),
 G('I ___ a pencil.','have',['has'],'Đi với "I" thì dùng "have".'),
 G('She ___ a new bag.','has',['have'],'Đi với "she" thì dùng "has".'),
 G('They ___ two cats.','have',['has'],'Đi với "they" thì dùng "have".'),
 G('A bird ___ fly.','can',['can’t'],'Chim biết bay nên dùng "can".'),
 G('A fish ___ walk.','can’t',['can'],'Cá không đi bộ được nên dùng "can’t".'),
 G('The cat is ___ the box. (ở trong)','in',['on'],'"in" nghĩa là ở trong.'),
 G('The book is ___ the table. (ở trên)','on',['in'],'"on" nghĩa là ở trên bề mặt.'),
 G('What ___ is it? It is red.','color',['name','food'],'"What color" hỏi về màu sắc.'),
 G('How ___ apples are there?','many',['much','long'],'Hỏi số lượng đếm được dùng "how many".'),
 G('I ___ to school every day.','go',['goes'],'Đi với "I" thì dùng "go".'),
 G('He ___ milk every morning.','drinks',['drink'],'Đi với "he" thì động từ thêm "s": drinks.'),
 G('Where ___ you from?','are',['is','am'],'Đi với "you" thì dùng "are".'),
 G('It is ___ the morning. (vào buổi sáng)','in',['at','on'],'Buổi sáng, chiều, tối dùng "in the".'),
 G('I like ___ and cheese. (bánh mì)','bread',['breads','a bread'],'"Bread" là danh từ không đếm được, không thêm "s".')
];

g.BHDATA = {TOPICS:TOPICS,BLOCK:BLOCK,UNCOUNT:UNCOUNT,PLURAL_IRR:PLURAL_IRR,PRAISE_VI:PRAISE_VI,PRAISE_EN:PRAISE_EN,SENT:SENT,GR:GR};
if (typeof module !== 'undefined') module.exports = g.BHDATA;
})(typeof window !== 'undefined' ? window : globalThis);
