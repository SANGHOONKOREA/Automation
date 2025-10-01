// 정렬 표시기 스타일 추가
function addSortIndicatorStyles() {
  const styleElem = document.createElement('style');
  styleElem.textContent = `
    th {
      cursor: pointer;
      position: relative;
      user-select: none;
    }
    th:hover {
      background-color: #264c70;
    }
    .sort-indicator {
      display: inline-block;
      margin-left: 5px;
      font-size: 0.8em;
    }
    th[data-field] {
      padding-right: 20px;
    }
  `;
  document.head.appendChild(styleElem);
}

/** ===============================
 *  Firebase 초기화
 * ===============================**/
const firebaseConfig = {
  apiKey: "AIzaSyCoOg2HPjk-oEhtVrLv3hH-3VLCwa2MAfE",
  authDomain: "sanghoon-d8f1c.firebaseapp.com",
  databaseURL: "https://sanghoon-d8f1c-default-rtdb.firebaseio.com",
  projectId: "sanghoon-d8f1c",
  storageBucket: "sanghoon-d8f1c.appspot.com",
  messagingSenderId: "495391900753",
  appId: "1:495391900753:web:b0d708eeca64fafe562470",
  measurementId: "G-J2E22BW61H"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// 전역 변수 및 상태 관리
let asData = [];
let filteredData = []; // 필터링된 데이터를 별도로 관리
let currentMode = 'manager';
let sortField = '';
let sortAsc = true;
let adminAuthorized = false;
let userData = [];
let isTableRendering = false;
let dataChanged = false;
let dataLoaded = false;
let modifiedRows = new Set();
let currentUser = null;
let currentUid = null;
let managerScheduleStatus = {};
let isExtendedView = false;
let currentLanguage = 'ko';
let adminPassword = 'snsys1234';

// 필터 디바운스 타이머
let filterDebounceTimer = null;

// 경로 정의
const asPath = 'as-service/data';
const userPath = 'as-service/users';
const histPath = 'as-service/history';
const aiHistoryPath = 'as-service/ai_history';
function getProjectHistoryRef(project) {
  return db.ref(`${aiHistoryPath}/${project}`);
}
const aiConfigPath = "as-service/admin/aiConfig";
const apiConfigPath = "as-service/admin/apiConfig";
const userMetaPath = 'as-service/user_meta';
const adminPasswordPath = 'as-service/admin/password';
const mainUsersPath = 'users';
const scheduleCheckPath = 'as-service/schedule_checks';

// AI/API 설정 글로벌 변수
let g_aiConfig = {
  apiKey: "",
  model: "",
  promptRow: "",
  promptHistory: "",
  promptOwner: ""
};

let g_apiConfig = {
  apiKey: "",
  baseUrl: "https://api.vesselfinder.com/masterdata"
};

// 연도별 AS 접수 건수 열 생성
const historyStartYear = 2020;
const currentYear = new Date().getFullYear();
const historyYears = Array.from({ length: currentYear - historyStartYear + 1 }, (_, i) => historyStartYear + i);
const historyYearColumns = historyYears.map(y => `historyCount${y}`);

// 기본 테이블 열 정의
const basicColumns = [
  'checkbox', '공번', '공사', 'imo', 'hull', 'shipName', 'shipowner', 'repMail', 'shipType',
  'group', 'shipyard', 'contract', 'asType', 'delivery', 'warranty',
  'manager', '현황', '현황번역', '동작여부', 'historyCount', 'history', 'AS접수일자', '기술적종료일',
  '경과일', '정상지연', '지연 사유', '수정일'
];

// 모든 테이블 열 정의
const allColumns = [
  'checkbox', '공번', '공사', 'imo', 'api_name', 'api_owner', 'api_manager', 'api_apply',
  'hull', 'shipName', 'shipowner', 'repMail', 'shipType', 'scale', '구분', 'major',
  'group', 'shipyard', 'contract', 'asType', 'delivery', 'warranty', 'prevManager',
  'manager', '현황', '현황번역', 'ai_summary', '동작여부', '조치계획', '접수내용',
  '조치결과', 'historyCount', ...historyYearColumns, 'history', 'AS접수일자', '기술적종료일', '경과일', '정상지연', '지연 사유', '수정일'
];

// 언어별 텍스트 사전
const translations = {
  ko: {
    "AS 현황 관리": "AS 현황 관리",
    "사용자": "사용자",
    "로그아웃": "로그아웃",
    "연결 상태": "연결 상태",
    "확인 중": "확인 중",
    "기본": "기본",
    "확장": "확장",
    "행 추가": "행 추가",
    "선택 행 삭제": "선택 행 삭제",
    "저장": "저장",
    "엑셀 다운로드": "엑셀 다운로드",
    "엑셀 업로드": "엑셀 업로드",
    "AS 현황 업로드": "AS 현황 업로드",
    "히스토리 조회": "히스토리 조회",
    "히스토리 전체 삭제": "히스토리 전체 삭제",
    "현황 번역": "현황 번역",
    "선사별 AI 요약": "선사별 AI 요약",
    "API 전체 반영": "API 전체 반영",
    "전체조회": "전체조회",
    "전체": "전체",
    "AS진행": "AS진행",
    "담당자": "담당자",
    "선주사": "선주사",
    "사용자 관리": "사용자 관리",
    "AI 설정 관리": "AI 설정 관리",
    "API 설정 관리": "API 설정 관리",
    "연결됨": "연결됨",
    "히스토리": "히스토리",
    "담당자별 현황": "담당자별 현황",
    "정상": "정상",
    "부분동작": "부분동작",
    "동작불가": "동작불가",
    "30일경과": "30일경과",
    "60일경과": "60일경과",
    "90일경과": "90일경과",
    "IMO NO.": "IMO NO.",
    "HULL NO.": "HULL NO.",
    "SHIPNAME": "SHIPNAME",
    "SHIPOWNER": "SHIPOWNER",
    "주요선사": "주요선사",
    "호선 대표메일": "호선 대표메일",
    "그룹": "그룹",
    "AS 구분": "AS 구분",
    "현 담당": "현 담당",
    "동작여부": "동작여부",
    "SHIP TYPE": "SHIP TYPE",
    "SHIPYARD": "SHIPYARD",
    "무상": "무상",
    "유상": "유상",
    "위탁": "위탁",
    "공번": "공번",
    "공사": "공사",
    "NAME": "NAME",
    "OWNER": "OWNER",
    "MANAGER": "MANAGER",
    "반영": "반영",
    "SCALE": "SCALE",
    "구분": "구분",
    "계약": "계약",
    "인도일": "인도일",
    "보증종료일": "보증종료일",
    "전 담당": "전 담당",
    "현황": "현황",
    "현황번역": "현황 번역",
    "AI 요약": "AI 요약",
    "조치계획": "조치계획",
    "접수내용": "접수내용",
    "조치결과": "조치결과",
    "AS접수건수": "AS접수건수",
    "AS접수일자": "AS접수일자",
    "기술적종료일": "기술적종료일",
    "경과일": "경과일",
    "정상지연": "정상지연",
    "지연 사유": "지연 사유",
    "수정일": "수정일",
    "변경 이력": "변경 이력",
    "사용자 관리": "사용자 관리",
    "API 설정 관리": "API 설정 관리",
    "엑셀 업로드 방식 선택": "엑셀 업로드 방식 선택",
    "전체 내용": "전체 내용",
    "선사별 접수내용/조치결과 요약": "선사별 접수내용/조치결과 요약",
    "AI 설정 관리": "AI 설정 관리",
    "AI 요약 진행 상황": "AI 요약 진행 상황",
    "API 데이터 가져오기": "API 데이터 가져오기",
    "비밀번호 초기화": "비밀번호 초기화",
    "비밀번호 변경": "비밀번호 변경",
    "관리자 비밀번호": "관리자 비밀번호"
  },
  en: {
    "AS 현황 관리": "AS Status Management",
    "사용자": "User",
    "로그아웃": "Logout",
    "연결 상태": "Connection Status",
    "확인 중": "Checking",
    "기본": "Basic",
    "확장": "Extended",
    "행 추가": "Add Row",
    "선택 행 삭제": "Delete Selected",
    "저장": "Save",
    "엑셀 다운로드": "Excel Download",
    "엑셀 업로드": "Excel Upload",
    "AS 현황 업로드": "AS Status Upload",
    "히스토리 조회": "View History",
    "히스토리 전체 삭제": "Clear All History",
    "현황 번역": "Translate Status",
    "선사별 AI 요약": "Owner AI Summary",
    "API 전체 반영": "API Refresh All",
    "전체조회": "View All",
    "전체": "All",
    "AS진행": "AS In Progress",
    "담당자": "Manager",
    "선주사": "Owner",
    "사용자 관리": "User Management",
    "AI 설정 관리": "AI Configuration",
    "API 설정 관리": "API Configuration",
    "연결됨": "Connected",
    "히스토리": "History",
    "담당자별 현황": "Manager Status",
    "정상": "Normal",
    "부분동작": "Partial Operation",
    "동작불가": "Inoperable",
    "30일경과": "30 Days+",
    "60일경과": "60 Days+",
    "90일경과": "90 Days+",
    "IMO NO.": "IMO NO.",
    "HULL NO.": "HULL NO.",
    "SHIPNAME": "SHIPNAME",
    "SHIPOWNER": "SHIPOWNER",
    "주요선사": "Major Shipping",
    "호선 대표메일": "Vessel Email",
    "그룹": "Group",
    "AS 구분": "AS Type",
    "현 담당": "Current Manager",
    "동작여부": "Operation Status",
    "SHIP TYPE": "SHIP TYPE",
    "SHIPYARD": "SHIPYARD",
    "전체": "All",
    "무상": "Free",
    "유상": "Paid",
    "위탁": "Consignment",
    "공번": "Project No.",
    "공사": "Work",
    "NAME": "NAME",
    "OWNER": "OWNER",
    "MANAGER": "MANAGER",
    "반영": "Apply",
    "SCALE": "SCALE",
    "구분": "Category",
    "계약": "Contract",
    "인도일": "Delivery Date",
    "보증종료일": "Warranty End",
    "전 담당": "Previous Manager",
    "현황": "Status",
    "현황번역": "Status Translation",
    "AI 요약": "AI Summary",
    "조치계획": "Action Plan",
    "접수내용": "Receipt Details",
    "조치결과": "Action Results",
    "AS접수건수": "AS Count",
    "AS접수일자": "AS Receipt Date",
    "기술적종료일": "Technical End Date",
    "경과일": "Elapsed Days",
    "정상지연": "Normal Delay",
    "지연 사유": "Delay Reason",
    "수정일": "Modified Date",
    "변경 이력": "Change History",
    "사용자 관리": "User Management",
    "API 설정 관리": "API Configuration",
    "엑셀 업로드 방식 선택": "Excel Upload Method",
    "전체 내용": "Full Content",
    "선사별 접수내용/조치결과 요약": "Owner-based Summary",
    "AI 설정 관리": "AI Configuration",
    "AI 요약 진행 상황": "AI Summary Progress",
    "API 데이터 가져오기": "API Data Retrieval",
    "비밀번호 초기화": "Reset Password",
    "비밀번호 변경": "Change Password",
    "관리자 비밀번호": "Administrator Password"
  },
  zh: {
    "AS 현황 관리": "AS状态管理",
    "사용자": "用户",
    "로그아웃": "登出",
    "연결 상태": "连接状态",
    "확인 중": "确认中",
    "기본": "基本",
    "확장": "扩展",
    "행 추가": "添加行",
    "선택 행 삭제": "删除所选",
    "저장": "保存",
    "엑셀 다운로드": "下载Excel",
    "엑셀 업로드": "上传Excel",
    "AS 현황 업로드": "上传AS状态",
    "히스토리 조회": "查看历史",
    "히스토리 전체 삭제": "清除所有历史",
    "현황 번역": "翻译状态",
    "선사별 AI 요약": "船东AI摘要",
    "API 전체 반영": "API全部更新",
    "전체조회": "查看全部",
    "전체": "全部",
    "AS진행": "AS进行中",
    "담당자": "负责人",
    "선주사": "船东",
    "사용자 관리": "用户管理",
    "AI 설정 관리": "AI设置管理",
    "API 설정 관리": "API设置管理",
    "연결됨": "已连接",
    "히스토리": "历史",
    "담당자별 현황": "负责人状态",
    "정상": "正常",
    "부분동작": "部分运行",
    "동작불가": "无法运行",
    "30일경과": "30天+",
    "60일경과": "60天+",
    "90일경과": "90天+",
    "IMO NO.": "IMO号码",
    "HULL NO.": "船体号码",
    "SHIPNAME": "船名",
    "SHIPOWNER": "船东",
    "주요선사": "主要船公司",
    "호선 대표메일": "船舶代表邮箱",
    "그룹": "组别",
    "AS 구분": "AS类型",
    "현 담당": "当前负责人",
    "동작여부": "运行状态",
    "SHIP TYPE": "船舶类型",
    "SHIPYARD": "造船厂",
    "무상": "免费",
    "유상": "有偿",
    "위탁": "委托",
    "공번": "项目编号",
    "공사": "工程",
    "NAME": "名称",
    "OWNER": "所有者",
    "MANAGER": "管理者",
    "반영": "应用",
    "SCALE": "规模",
    "구분": "类别",
    "계약": "合同",
    "인도일": "交付日期",
    "보증종료일": "保修结束日",
    "전 담당": "前任负责人",
    "현황": "状态",
    "현황번역": "状态翻译",
    "AI 요약": "AI摘要",
    "조치계획": "措施计划",
    "접수내용": "接收内容",
    "조치결과": "措施结果",
    "AS접수건수": "AS数量",
    "AS접수일자": "AS接收日期",
    "기술적종료일": "技术终止日期",
    "경과일": "经过天数",
    "정상지연": "正常延迟",
    "지연 사유": "延迟原因",
    "수정일": "修改日期",
    "변경 이력": "变更历史",
    "사용자 관리": "用户管理",
    "API 설정 관리": "API设置管理",
    "엑셀 업로드 방식 선택": "Excel上传方式选择",
    "전체 내용": "全部内容",
    "선사별 접수내용/조치결과 요약": "按船东分类的摘要",
    "AI 설정 관리": "AI设置管理",
    "AI 요약 진행 상황": "AI摘要进展",
    "API 데이터 가져오기": "获取API数据",
    "비밀번호 초기화": "重置密码",
    "비밀번호 변경": "更改密码",
    "관리자 비밀번호": "管理员密码"
  },
  ja: {
    "AS 현황 관리": "ASステータス管理",
    "사용자": "ユーザー",
    "로그아웃": "ログアウト",
    "연결 상태": "接続状態",
    "확인 중": "確認中",
    "기본": "基本",
    "확장": "拡張",
    "행 추가": "行追加",
    "선택 행 삭제": "選択行削除",
    "저장": "保存",
    "엑셀 다운로드": "Excel ダウンロード",
    "엑셀 업로드": "Excel アップロード",
    "AS 현황 업로드": "ASステータスアップロード",
    "히스토리 조회": "履歴表示",
    "히스토리 전체 삭제": "履歴全削除",
    "현황 번역": "ステータス翻訳",
    "선사별 AI 요약": "船主AI要約",
    "API 전체 반영": "API全体反映",
    "전체조회": "全体表示",
    "전체": "全体",
    "AS진행": "AS進行中",
    "담당자": "担当者",
    "선주사": "船主",
    "사용자 관리": "ユーザー管理",
    "AI 설정 관리": "AI設定管理",
    "API 설정 관리": "API設定管理",
    "연결됨": "接続済み",
    "히스토리": "履歴",
    "담당자별 현황": "担当者別状況",
    "정상": "正常",
    "부분동작": "部分動作",
    "동작불가": "動作不可",
    "30일경과": "30日+",
    "60일경과": "60日+",
    "90일경과": "90日+",
    "IMO NO.": "IMO番号",
    "HULL NO.": "船体番号",
    "SHIPNAME": "船名",
    "SHIPOWNER": "船主",
    "주요선사": "主要船社",
    "호선 대표메일": "船舶代表メール",
    "그룹": "グループ",
    "AS 구분": "AS区分",
    "현 담당": "現担当者",
    "동작여부": "動作状態",
    "SHIP TYPE": "船舶タイプ",
    "SHIPYARD": "造船所",
    "무상": "無償",
    "유상": "有償",
    "위탁": "委託",
    "공번": "工番",
    "공사": "工事",
    "NAME": "名称",
    "OWNER": "所有者",
    "MANAGER": "管理者",
    "반영": "反映",
    "SCALE": "規模",
    "구분": "区分",
    "계약": "契約",
    "인도일": "引渡日",
    "보증종료일": "保証終了日",
    "전 담당": "前担当者",
    "현황": "状況",
    "현황번역": "状況翻訳",
    "AI 요약": "AI要約",
    "조치계획": "措置計画",
    "접수내용": "受付内容",
    "조치결과": "措置結果",
    "AS접수건수": "AS件数",
    "AS접수일자": "AS受付日",
    "기술적종료일": "技術的終了日",
    "경과일": "経過日数",
    "정상지연": "正常遅延",
    "지연 사유": "遅延理由",
    "수정일": "修正日",
    "변경 이력": "変更履歴",
    "사용자 관리": "ユーザー管理",
    "API 설정 관리": "API設定管理",
    "엑셀 업로드 방식 선택": "Excelアップロード方式選択",
    "전체 내용": "全体内容",
    "선사별 접수내용/조치결과 요약": "船主別要約",
    "AI 설정 관리": "AI設定管理",
    "AI 요약 진행 상황": "AI要約進行状況",
    "API 데이터 가져오기": "APIデータ取得",
    "비밀번호 초기화": "パスワードリセット",
    "비밀번호 변경": "パスワード変更",
    "관리자 비밀번호": "管理者パスワード"
  }
};

/** ===============================
 *  초기화 및 이벤트 핸들러 등록
 * ===============================**/
document.addEventListener('DOMContentLoaded', () => {

  registerEventListeners();
  addTableScrollStyles();
  addSortIndicatorStyles();
  initializeLanguage();
  loadAdminPassword();
});

// 모든 이벤트 리스너 등록 함수
function registerEventListeners() {
  // 사이드바 관련
  document.getElementById('btnManager').addEventListener('click', () => switchSideMode('manager'));
  document.getElementById('btnOwner').addEventListener('click', () => switchSideMode('owner'));
  
  // 기본/확장 뷰 버튼
  document.getElementById('basicViewBtn').addEventListener('click', () => switchTableView(false));
  document.getElementById('extendedViewBtn').addEventListener('click', () => switchTableView(true));
  
  // 사용자 관리 관련
  document.getElementById('userManageBtn').addEventListener('click', () => checkAdminPassword(openUserModal));
  document.getElementById('addUserConfirmBtn').addEventListener('click', addNewUser);
  document.getElementById('deleteSelectedUsersBtn').addEventListener('click', deleteSelectedUsers);
  
  // AI 설정 관련
  document.getElementById('aiConfigBtn').addEventListener('click', () => checkAdminPassword(openAiConfigModal));
  document.getElementById('saveAiConfigBtn').addEventListener('click', saveAiConfig);
  document.getElementById('ownerAISummaryBtn').addEventListener('click', openOwnerAIModal);
  
  // API 설정 관련
  document.getElementById('apiConfigBtn').addEventListener('click', () => checkAdminPassword(openApiConfigModal));
  document.getElementById('saveApiConfigBtn').addEventListener('click', saveApiConfig);
  document.getElementById('apiRefreshAllBtn').addEventListener('click', () => checkAdminPassword(refreshAllVessels));
  
  // 테이블 관련
  document.getElementById('asTable').addEventListener('click', handleTableClick);
  document.getElementById('selectAll').addEventListener('change', toggleSelectAll);
  document.getElementById('addRowBtn').addEventListener('click', () => checkAdminPassword(addNewRow));
  document.getElementById('deleteRowBtn').addEventListener('click', () => checkAdminPassword(deleteSelectedRows));
  document.getElementById('saveBtn').addEventListener('click', saveAllData);
  
  // 전체조회 버튼 - 개선된 이벤트 핸들러
  document.getElementById('loadBtn').addEventListener('click', () => {
    clearAllFilters();
    loadAllData();
  });
  
  // 엑셀 관련
  document.getElementById('downloadExcelBtn').addEventListener('click', downloadExcel);
  document.getElementById('uploadExcelBtn').addEventListener('click', () => checkAdminPassword(() => document.getElementById('excelModal').style.display = 'block'));
  document.getElementById('excelReplaceBtn').addEventListener('click', () => { document.getElementById('excelModal').style.display = 'none'; proceedExcelUpload("replace"); });
  document.getElementById('excelAppendBtn').addEventListener('click', () => { document.getElementById('excelModal').style.display = 'none'; proceedExcelUpload("append"); });
  document.getElementById('excelCancelBtn').addEventListener('click', () => document.getElementById('excelModal').style.display = 'none');
  
  // AS 현황 업로드
  document.getElementById('uploadAsStatusBtn').addEventListener('click', () => checkAdminPassword(() => document.getElementById('uploadAsStatusInput').click()));
  document.getElementById('uploadAsStatusInput').addEventListener('change', handleAsStatusUpload);
  
  // 히스토리 관련
  document.getElementById('historyBtn').addEventListener('click', () => checkAdminPassword(showHistoryModal));
  document.getElementById('clearHistoryBtn').addEventListener('click', () => checkAdminPassword(clearHistory));
  
  // 담당자별 현황 버튼
  document.getElementById('managerStatusBtn').addEventListener('click', openManagerStatusModal);
  
  // 일정 확인 버튼 추가
  const scheduleCheckBtn = document.createElement('button');
  scheduleCheckBtn.id = 'scheduleCheckBtn';
  scheduleCheckBtn.textContent = '담당자 확인';
  scheduleCheckBtn.style.cssText = 'background:#17a2b8; color:#fff; margin-left:10px;';
  scheduleCheckBtn.addEventListener('click', confirmCurrentUserSchedule);
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn && logoutBtn.parentNode) {
    logoutBtn.parentNode.insertBefore(scheduleCheckBtn, logoutBtn);
  }
  
  // 번역 관련
  document.getElementById('translateBtn').addEventListener('click', translateStatusField);
  
  // 비밀번호 찾기 관련
  document.getElementById('forgotPasswordLink').addEventListener('click', openForgotPasswordModal);
  document.getElementById('sendResetLinkBtn').addEventListener('click', sendPasswordResetEmail);
  
  // 비밀번호 변경 관련
  document.getElementById('changePasswordBtn').addEventListener('click', changeUserPassword);
  document.getElementById('currentPassword').addEventListener('keypress', (e) => { if (e.key === 'Enter') e.preventDefault(), document.getElementById('newPassword').focus(); });
  document.getElementById('newPassword').addEventListener('keypress', (e) => { if (e.key === 'Enter') e.preventDefault(), document.getElementById('confirmPassword').focus(); });
  document.getElementById('confirmPassword').addEventListener('keypress', (e) => { if (e.key === 'Enter') e.preventDefault(), document.getElementById('changePasswordBtn').click(); });
  
  // 로그인 관련
  document.getElementById('loginConfirmBtn').addEventListener('click', performLogin);
  document.getElementById('loginPw').addEventListener('keypress', (e) => { if (e.key === 'Enter') e.preventDefault(), performLogin(); });
  document.getElementById('loginUser').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!document.getElementById('loginPw').value.trim()) {
        document.getElementById('loginPw').focus();
      } else {
        performLogin();
      }
    }
  });
  document.getElementById('resetEmail').addEventListener('keypress', (e) => { if (e.key === 'Enter') e.preventDefault(), document.getElementById('sendResetLinkBtn').click(); });
  document.getElementById('logoutBtn').addEventListener('click', logoutUser);
  
  // ESC 키 이벤트 처리
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const forgotPasswordModal = document.getElementById('forgotPasswordModal');
      if (forgotPasswordModal && forgotPasswordModal.style.display === 'block') {
        closeForgotPasswordModal();
      }
      
      const changePasswordModal = document.getElementById('changePasswordModal');
      if (changePasswordModal && 
          changePasswordModal.style.display === 'block' &&
          changePasswordModal.getAttribute('data-first-login') !== 'true') {
        changePasswordModal.style.display = 'none';
      }
      
      const contentModal = document.getElementById('contentModal');
      if (contentModal && contentModal.style.display === 'block') {
        closeContentModal();
      }
      
      const ownerAIModal = document.getElementById('ownerAIModal');
      if (ownerAIModal && ownerAIModal.style.display === 'block') {
        ownerAIModal.style.display = 'none';
      }
      
      const aiProgressModal = document.getElementById('aiProgressModal');
      if (aiProgressModal && aiProgressModal.style.display === 'block') {
        aiProgressModal.style.display = 'none';
      }
      
      const apiProgressModal = document.getElementById('apiProgressModal');
      if (apiProgressModal && apiProgressModal.style.display === 'block') {
        apiProgressModal.style.display = 'none';
      }
      
      const apiConfigModal = document.getElementById('apiConfigModal');
      if (apiConfigModal && apiConfigModal.style.display === 'block') {
        closeApiConfigModal();
      }
    }
  });
  
  // 열 리사이징 관련
  document.addEventListener('mousedown', handleMouseDown);
  
  // 필터 이벤트 설정 - 개선된 방식
  setupFilterEventListeners();
  
  // 언어 선택 버튼 이벤트 리스너 등록
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const lang = this.getAttribute('data-lang');
      changeLanguage(lang);
    });
  });
  
  // 경과일 상태 카드 클릭 이벤트 리스너
  setupElapsedDayFilters();
}

// 동작여부 상태 카드 클릭 이벤트 리스너 추가
setupOperationStatusFilters();

// 개선된 필터 이벤트 리스너 설정
function setupFilterEventListeners() {
  const filterInputs = [
    'filterIMO', 'filterHull', 'filterName', 'filterOwner', 
    'filterMajor', 'filterRepMail', 'filterManager', 
    'filterShipType', 'filterShipyard'
  ];
  
  const filterSelects = [
    'filterGroup', 'filterAsType', 'filterActive'
  ];
  
  // 텍스트 입력 필터
  filterInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', handleFilterChange);
    }
  });
  
  // 셀렉트 필터
  filterSelects.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', handleFilterChange);
    }
  });
}

// 동작여부 상태 필터 설정
function setupOperationStatusFilters() {
  // 정상 카드 클릭
  document.getElementById('count정상').parentElement.addEventListener('click', () => {
    filterByOperationStatus('정상');
  });
  
  // 부분동작 카드 클릭
  document.getElementById('count부분동작').parentElement.addEventListener('click', () => {
    filterByOperationStatus('부분동작');
  });
  
  // 동작불가 카드 클릭
  document.getElementById('count동작불가').parentElement.addEventListener('click', () => {
    filterByOperationStatus('동작불가');
  });
}

// 동작여부별 필터링
function filterByOperationStatus(status) {
  // 현재 선택된 동작여부와 같으면 해제, 다르면 적용
  const currentStatus = document.getElementById('filterActive').value;
  
  if (currentStatus === status) {
    // 같은 상태를 다시 클릭하면 필터 해제
    document.getElementById('filterActive').value = '';
  } else {
    // 다른 상태를 클릭하면 해당 상태로 필터 설정
    document.getElementById('filterActive').value = status;
  }
  
  // 필터 적용 (기존 필터 조건 유지)
  applyFilters();
}

// 필터 변경 핸들러 - 디바운스 적용
function handleFilterChange() {
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer);
  }
  
  filterDebounceTimer = setTimeout(() => {
    applyFilters();
  }, 300); // 300ms 디바운스
}

// applyFilters 함수 수정 - 경과일 필터 추가
function applyFilters() {
  if (!dataLoaded || asData.length === 0) {
    console.log('데이터가 아직 로드되지 않았습니다.');
    return;
  }
  
  // 필터값 수집
  const filters = {
    imo: document.getElementById('filterIMO').value.toLowerCase().trim(),
    hull: document.getElementById('filterHull').value.toLowerCase().trim(),
    name: document.getElementById('filterName').value.toLowerCase().trim(),
    owner: document.getElementById('filterOwner').value.toLowerCase().trim(),
    major: document.getElementById('filterMajor').value.toLowerCase().trim(),
    repMail: document.getElementById('filterRepMail').value.toLowerCase().trim(),
    group: document.getElementById('filterGroup').value,
    asType: document.getElementById('filterAsType').value,
    manager: document.getElementById('filterManager').value.toLowerCase().trim(),
    active: document.getElementById('filterActive').value,
    shipType: document.getElementById('filterShipType').value.toLowerCase().trim(),
    shipyard: document.getElementById('filterShipyard').value.toLowerCase().trim()
  };
  
  // 경과일 필터 추가
  const elapsedDayFilter = window.elapsedDayFilter || null;
  
  // 모든 필터가 비어있는지 확인 (경과일 필터 포함)
  const hasActiveFilter = Object.values(filters).some(val => val !== '') || elapsedDayFilter !== null;
  
  if (!hasActiveFilter) {
    // 필터가 없으면 빈 화면 표시
    filteredData = [];
    updateTable();
    return;
  }
  
  // 필터링 실행
  filteredData = asData.filter(row => {
    // 빈 데이터 필터링
    if (!row || !row.uid) return false;
    
    // 최소한의 데이터가 있는지 확인
    const hasValidData = row.공번 || row.imo || row.hull || row.shipName || row.manager || row.shipowner;
    if (!hasValidData) return false;
    
    // 경과일 필터 적용
    if (elapsedDayFilter !== null) {
      if (row["기술적종료일"]) return false;
      if (!row["AS접수일자"]) return false;
      
      const today = new Date();
      const asDate = new Date(row["AS접수일자"] + "T00:00");
      if (isNaN(asDate.getTime())) return false;
      
      const diffDays = Math.floor((today - asDate) / (1000 * 3600 * 24));
      if (diffDays < elapsedDayFilter) return false;
    }
    
    // 기존 필터들 적용
    if (filters.imo && !String(row.imo || '').toLowerCase().includes(filters.imo)) {
      return false;
    }
    
    if (filters.hull && !String(row.hull || '').toLowerCase().includes(filters.hull)) {
      return false;
    }
    
    if (filters.name && !String(row.shipName || '').toLowerCase().includes(filters.name)) {
      return false;
    }
    
    if (filters.owner && !String(row.shipowner || '').toLowerCase().includes(filters.owner)) {
      return false;
    }
    
    if (filters.major && !String(row.major || '').toLowerCase().includes(filters.major)) {
      return false;
    }
    
    if (filters.repMail && !String(row.repMail || '').toLowerCase().includes(filters.repMail)) {
      return false;
    }
    
    if (filters.group && String(row.group || '') !== filters.group) {
      return false;
    }
    
    if (filters.asType && row.asType !== filters.asType) {
      return false;
    }
    
    if (filters.manager && !String(row.manager || '').toLowerCase().includes(filters.manager)) {
      return false;
    }
    
    if (filters.active && row.동작여부 !== filters.active) {
      return false;
    }
    
    if (filters.shipType && !String(row.shipType || '').toLowerCase().includes(filters.shipType)) {
      return false;
    }
    
    if (filters.shipyard && !String(row.shipyard || '').toLowerCase().includes(filters.shipyard)) {
      return false;
    }
    
    return true;
  });
  
  console.log(`필터링 결과: ${filteredData.length}개`);
  
  // 정렬 적용
  if (sortField) {
    applySorting();
  }
  
  // 테이블 업데이트
  updateTable();
}

// 정렬 적용 함수
function applySorting() {
  if (!sortField) return;
  
  filteredData.sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';
    
    // 경과일 필드의 경우 특별 처리
    if (sortField === '경과일') {
      const aNum = typeof aVal === 'string' ? parseInt(aVal.replace(/[^0-9]/g, '')) || 0 : 0;
      const bNum = typeof bVal === 'string' ? parseInt(bVal.replace(/[^0-9]/g, '')) || 0 : 0;
      return sortAsc ? aNum - bNum : bNum - aNum;
    }
    
    // 날짜 필드의 경우
    if (['delivery', 'warranty', 'AS접수일자', '기술적종료일', '수정일'].includes(sortField)) {
      const aDate = aVal ? new Date(aVal) : new Date(0);
      const bDate = bVal ? new Date(bVal) : new Date(0);
      return sortAsc ? aDate - bDate : bDate - aDate;
    }
    
    // 숫자 필드의 경우
    if (['group'].includes(sortField)) {
      const aNum = parseFloat(aVal) || 0;
      const bNum = parseFloat(bVal) || 0;
      return sortAsc ? aNum - bNum : bNum - aNum;
    }
    
    // 문자열 필드의 경우
    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();
    
    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });
}

// 테이블 업데이트 함수 - 최적화
function updateTable() {
  if (isTableRendering) return;
  isTableRendering = true;
  
  try {
    // 헤더 렌더링
    renderTableHeaders();
    
    // 바디 렌더링
    const tbody = document.getElementById('asBody');
    tbody.innerHTML = '';
    
    // 상태 집계
    const counts = {정상: 0, 부분동작: 0, 동작불가: 0};
    
    // DocumentFragment 사용하여 성능 향상
    const fragment = document.createDocumentFragment();
    
    filteredData.forEach(row => {
      if (counts.hasOwnProperty(row.동작여부)) {
        counts[row.동작여부]++;
      }
      const tr = createTableRow(row);
      fragment.appendChild(tr);
    });
    
    tbody.appendChild(fragment);
    
    // 상태 업데이트
    updateStatusCounts(counts);
    updateElapsedDayCounts();
    updateSidebarList();
    
  } finally {
    isTableRendering = false;
  }
}

// 전체 데이터 로드 및 표시
function loadAllData() {
  if (!dataLoaded || asData.length === 0) {
    console.log('데이터가 아직 로드되지 않았습니다.');
    return;
  }
  
  // 전체 데이터를 필터링된 데이터로 설정
  filteredData = [...asData];
  
  // 정렬 적용
  if (sortField) {
    applySorting();
  }
  
  // 테이블 업데이트
  updateTable();
}

// 전체조회 버튼 함수도 수정
function clearAllFilters() {
  document.getElementById('filterIMO').value = '';
  document.getElementById('filterHull').value = '';
  document.getElementById('filterName').value = '';
  document.getElementById('filterOwner').value = '';
  document.getElementById('filterMajor').value = '';
  document.getElementById('filterRepMail').value = '';
  document.getElementById('filterGroup').value = '';
  document.getElementById('filterAsType').value = '';
  document.getElementById('filterManager').value = '';
  document.getElementById('filterActive').value = '';
  document.getElementById('filterShipType').value = '';
  document.getElementById('filterShipyard').value = '';
  
  // 경과일 필터도 초기화
  window.elapsedDayFilter = null;
}

// 관리자 비밀번호 로드
async function loadAdminPassword() {
  try {
    const snapshot = await db.ref(adminPasswordPath).once('value');
    if (snapshot.exists()) {
      adminPassword = snapshot.val();
    } else {
      await db.ref(adminPasswordPath).set('snsys1234');
      adminPassword = 'snsys1234';
    }
  } catch (error) {
    console.error('관리자 비밀번호 로드 오류:', error);
    adminPassword = 'snsys1234';
  }
}

// 관리자 비밀번호 확인 함수
function checkAdminPassword(callback) {
  if (adminAuthorized) {
    callback();
    return;
  }

  const passwordInput = prompt("관리자 비밀번호를 입력하세요:");
  if (passwordInput === null) return;

  if (passwordInput === adminPassword) {
    adminAuthorized = true;
    setTimeout(() => {
      adminAuthorized = false;
    }, 5 * 60 * 1000);
    callback();
  } else {
    alert("관리자 비밀번호가 올바르지 않습니다.");
  }
}

// 테이블 뷰 전환 함수 - 개선
function switchTableView(extended) {
  if (isExtendedView === extended) return;
  
  isExtendedView = extended;
  
  // 버튼 상태 변경
  document.getElementById('basicViewBtn').classList.toggle('active', !extended);
  document.getElementById('extendedViewBtn').classList.toggle('active', extended);
  
  // 현재 필터링된 데이터로 테이블 다시 렌더링
  updateTable();
}

// 경과일 필터 설정
function setupElapsedDayFilters() {
  document.getElementById('count30Days').parentElement.addEventListener('click', () => filterByElapsedDays(30));
  document.getElementById('count60Days').parentElement.addEventListener('click', () => filterByElapsedDays(60));
  document.getElementById('count90Days').parentElement.addEventListener('click', () => filterByElapsedDays(90));
}

// 경과일별 필터링
function filterByElapsedDays(days) {
  // 경과일 필터 상태 관리를 위한 전역 변수 추가
  if (!window.elapsedDayFilter) {
    window.elapsedDayFilter = null;
  }
  
  // 같은 경과일을 다시 클릭하면 해제
  if (window.elapsedDayFilter === days) {
    window.elapsedDayFilter = null;
    applyFilters();
    return;
  }
  
  // 새로운 경과일 필터 설정
  window.elapsedDayFilter = days;
  applyFilters();
}

// 테이블 헤더 렌더링
function renderTableHeaders() {
  const thead = document.querySelector('#asTable thead tr');
  if (!thead) return;
  
  const columnsToShow = isExtendedView ? allColumns : basicColumns;

  const headerDefinitions = {
    'checkbox': { field: null, text: '', isCheckbox: true },
    '공번': { field: '공번', text: '공번' },
    '공사': { field: '공사', text: '공사' },
    'imo': { field: 'imo', text: 'IMO NO.' },
    'api_name': { field: 'api_name', text: 'NAME' },
    'api_owner': { field: 'api_owner', text: 'OWNER' },
    'api_manager': { field: 'api_manager', text: 'MANAGER' },
    'api_apply': { field: null, text: '반영' },
    'hull': { field: 'hull', text: 'HULL NO.' },
    'shipName': { field: 'shipName', text: 'SHIPNAME' },
    'repMail': { field: 'repMail', text: '호선 대표메일' },
    'shipType': { field: 'shipType', text: 'SHIP TYPE' },
    'scale': { field: 'scale', text: 'SCALE' },
    '구분': { field: '구분', text: '구분' },
    'shipowner': { field: 'shipowner', text: 'SHIPOWNER' },
    'major': { field: 'major', text: '주요선사' },
    'group': { field: 'group', text: '그룹' },
    'shipyard': { field: 'shipyard', text: 'SHIPYARD' },
    'contract': { field: 'contract', text: '계약' },
    'asType': { field: 'asType', text: 'AS 구분' },
    'delivery': { field: 'delivery', text: '인도일' },
    'warranty': { field: 'warranty', text: '보증종료일' },
    'prevManager': { field: 'prevManager', text: '전 담당' },
    'manager': { field: 'manager', text: '현 담당' },
    '현황': { field: '현황', text: '현황' },
    '현황번역': { field: '현황번역', text: '현황 번역' },
    'ai_summary': { field: null, text: 'AI 요약', isAI: true },
    '동작여부': { field: '동작여부', text: '동작여부' },
    '조치계획': { field: '조치계획', text: '조치계획' },
    '접수내용': { field: '접수내용', text: '접수내용' },
    '조치결과': { field: '조치결과', text: '조치결과' },
    'historyCount': { field: null, text: 'AS접수건수', isHistoryCount: true },
    'history': { field: null, text: '히스토리', isHistory: true },
    'AS접수일자': { field: 'AS접수일자', text: 'AS접수일자' },
    '기술적종료일': { field: '기술적종료일', text: '기술적종료일' },
    '경과일': { field: '경과일', text: '경과일' },
    '정상지연': { field: '정상지연', text: '정상지연' },
    '지연 사유': { field: '지연 사유', text: '지연 사유' },
    '수정일': { field: '수정일', text: '수정일' }
  };

  historyYears.forEach(year => {
    headerDefinitions[`historyCount${year}`] = { field: null, text: String(year) };
  });

  thead.innerHTML = '';

  columnsToShow.forEach(columnKey => {
    const headerDef = headerDefinitions[columnKey];
    if (!headerDef) return;

    const th = document.createElement('th');
    if (headerDef.isCheckbox) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'selectAll';
      checkbox.addEventListener('change', toggleSelectAll);
      th.appendChild(checkbox);
    } else {
      const translatedText = translations[currentLanguage][headerDef.text] || headerDef.text;
      th.setAttribute('data-field', headerDef.field || columnKey);

      if (headerDef.field) {
        th.style.cursor = 'pointer';
        const textNode = document.createTextNode(translatedText);
        th.appendChild(textNode);

        if (sortField === headerDef.field) {
          const sortIndicator = document.createElement('span');
          sortIndicator.className = 'sort-indicator';
          sortIndicator.innerHTML = sortAsc ? ' \u25b2' : ' \u25bc';
          th.appendChild(sortIndicator);
        }
      } else {
        th.textContent = translatedText;
      }

      const resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      th.appendChild(resizer);
    }

    thead.appendChild(th);
  });
}

// 언어 초기화
function initializeLanguage() {
  try {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage && translations[savedLanguage]) {
      currentLanguage = savedLanguage;
      
      document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn && btn.getAttribute) {
          if (btn.getAttribute('data-lang') === savedLanguage) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        }
      });
    }
    
    updateUILanguage();
  } catch (error) {
    console.error('언어 초기화 중 오류:', error);
    currentLanguage = 'ko';
  }
}

// 언어 변경
function changeLanguage(lang) {
  if (currentLanguage === lang) return;
  
  currentLanguage = lang;
  
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  updateUILanguage();
  updateTable();
  updateSidebarList();
  
  localStorage.setItem('selectedLanguage', lang);
}

// UI 언어 업데이트
function updateUILanguage() {
  const langData = translations[currentLanguage];
  if (!langData) return;
  
  // 헤더 텍스트
  const h1 = document.querySelector('.header h1');
  if (h1) h1.textContent = langData["AS 현황 관리"] || "AS 현황 관리";
  
  // 사용자 정보
  const userInfoText = langData["사용자"] || "사용자";
  const userName = document.getElementById('currentUserName')?.textContent || "-";
  const userInfoEl = document.getElementById('userInfo');
  if (userInfoEl) {
    userInfoEl.innerHTML = `${userInfoText}: <span id="currentUserName">${userName}</span>`;
  }
  
  // 연결 상태
  const connectionStatus = document.getElementById('connectionStatus');
  if (connectionStatus) {
    const statusText = connectionStatus.textContent;
    const statusValue = statusText.includes(':') ? statusText.split(':')[1].trim() : "확인 중";
    
    let translatedStatus = statusValue;
    if (statusValue === "확인 중" || statusValue === "Checking" || statusValue === "确认中" || statusValue === "確認中") {
      translatedStatus = langData["확인 중"] || "확인 중";
    } else if (statusValue === "Firebase 연결됨" || statusValue === "Firebase Connected") {
      translatedStatus = "Firebase " + (langData["연결됨"] || "연결됨");
    }
    
    connectionStatus.textContent = `${langData["연결 상태"] || "연결 상태"}: ${translatedStatus}`;
  }
  
  // 상태 카드
  const statusCards = {
    '정상': ['정상', 'Normal', '正常', '正常'],
    '부분동작': ['부분동작', 'Partial Operation', '部分运行', '部分動作'],
    '동작불가': ['동작불가', 'Inoperable', '无法运行', '動作不可'],
    '30일경과': ['30일경과', '30 Days+', '30天+', '30日+'],
    '60일경과': ['60일경과', '60 Days+', '60天+', '60日+'],
    '90일경과': ['90일경과', '90 Days+', '90天+', '90日+']
  };
  
  document.querySelectorAll('.status-card h3').forEach(el => {
    const currentText = el.textContent.trim();
    for (const [koKey, variations] of Object.entries(statusCards)) {
      if (variations.includes(currentText)) {
        el.textContent = langData[koKey] || koKey;
        break;
      }
    }
  });
  
  // 필터 레이블
  const labelMappings = {
    'IMO NO.': ['IMO NO.', 'IMO NO.', 'IMO号码', 'IMO番号'],
    'HULL NO.': ['HULL NO.', 'HULL NO.', '船体号码', '船体番号'],
    'SHIPNAME': ['SHIPNAME', 'SHIPNAME', '船名', '船名'],
    'SHIPOWNER': ['SHIPOWNER', 'SHIPOWNER', '船东', '船主'],
    '주요선사': ['주요선사', 'Major Shipping', '主要船公司', '主要船社'],
    '호선 대표메일': ['호선 대표메일', 'Vessel Email', '船舶代表邮箱', '船舶代表メール'],
    '그룹': ['그룹', 'Group', '组别', 'グループ'],
    'AS 구분': ['AS 구분', 'AS Type', 'AS类型', 'AS区分'],
    '현 담당': ['현 담당', 'Current Manager', '当前负责人', '現担当者'],
    '동작여부': ['동작여부', 'Operation Status', '运行状态', '動作状態'],
    'SHIP TYPE': ['SHIP TYPE', 'SHIP TYPE', '船舶类型', '船舶タイプ'],
    'SHIPYARD': ['SHIPYARD', 'SHIPYARD', '造船厂', '造船所']
  };
  
  document.querySelectorAll('.filter-group label').forEach(el => {
    const currentText = el.textContent.trim();
    for (const [koKey, variations] of Object.entries(labelMappings)) {
      if (variations.includes(currentText)) {
        el.textContent = langData[koKey] || koKey;
        break;
      }
    }
  });
  
  // 버튼 텍스트
  const buttonMappings = {
    'loadBtn': '전체조회',
    'basicViewBtn': '기본',
    'extendedViewBtn': '확장',
    'addRowBtn': '행 추가',
    'deleteRowBtn': '선택 행 삭제',
    'saveBtn': '저장',
    'downloadExcelBtn': '엑셀 다운로드',
    'uploadExcelBtn': '엑셀 업로드',
    'uploadAsStatusBtn': 'AS 현황 업로드',
    'historyBtn': '히스토리 조회',
    'clearHistoryBtn': '히스토리 전체 삭제',
    'translateBtn': '현황 번역',
    'ownerAISummaryBtn': '선사별 AI 요약',
    'apiRefreshAllBtn': 'API 전체 반영',
    'managerStatusBtn': '담당자별 현황',
    'logoutBtn': '로그아웃',
    'btnManager': '담당자',
    'btnOwner': '선주사',
    'userManageBtn': '사용자 관리',
    'aiConfigBtn': 'AI 설정 관리',
    'apiConfigBtn': 'API 설정 관리'
  };
  
  document.querySelectorAll('button').forEach(btn => {
    if (btn.classList.contains('lang-btn')) return;
    
    if (btn.id && buttonMappings[btn.id]) {
      const koKey = buttonMappings[btn.id];
      btn.textContent = langData[koKey] || koKey;
    }
  });
  
  // 사이드바 제목
  const listTitle = document.getElementById('listTitle');
  if (listTitle) {
    const currentText = listTitle.textContent;
    if (currentText.includes('담당') || currentText.includes('Manager') || currentText.includes('负责人') || currentText.includes('担当者')) {
      listTitle.textContent = `${langData['현 담당'] || '현 담당'} 목록`;
    } else if (currentText.includes('SHIPOWNER') || currentText.includes('船东') || currentText.includes('船主') || currentText.includes('선주사')) {
      listTitle.textContent = `${langData['SHIPOWNER'] || 'SHIPOWNER'} 목록`;
    }
  }
  
  updateSelectOptions(langData);
}

// Select 옵션 업데이트
function updateSelectOptions(langData) {
  const asTypeFilter = document.getElementById('filterAsType');
  if (asTypeFilter) {
    Array.from(asTypeFilter.options).forEach(option => {
      const value = option.value;
      if (!value) option.textContent = langData["전체"] || "전체";
      else if (value === "무상") option.textContent = langData["무상"] || "무상";
      else if (value === "유상") option.textContent = langData["유상"] || "유상";
      else if (value === "위탁") option.textContent = langData["위탁"] || "위탁";
    });
  }
  
  const activeFilter = document.getElementById('filterActive');
  if (activeFilter) {
    Array.from(activeFilter.options).forEach(option => {
      const value = option.value;
      if (!value) option.textContent = langData["전체"] || "전체";
      else if (value === "정상") option.textContent = langData["정상"] || "정상";
      else if (value === "부분동작") option.textContent = langData["부분동작"] || "부분동작";
      else if (value === "동작불가") option.textContent = langData["동작불가"] || "동작불가";
    });
  }
  
  const groupFilter = document.getElementById('filterGroup');
  if (groupFilter && groupFilter.options[0]) {
    groupFilter.options[0].textContent = langData["전체"] || "전체";
  }
}

/** ==================================
 *  사용자 인증 및 관리
 * ===================================*/
auth.onAuthStateChanged(async (user) => {
  if (user) {
    document.getElementById('loginModal').style.display = 'none';
    
    try {
      const mainUsersSnapshot = await db.ref(mainUsersPath).once('value');
      const mainUsers = mainUsersSnapshot.val() || {};
      
      let displayName = user.email;
      for (const uid in mainUsers) {
        if (mainUsers[uid].email === user.email) {
          displayName = mainUsers[uid].id || user.email;
          break;
        }
      }
      
      document.getElementById('currentUserName').textContent = displayName;
      
      currentUid = user.uid;
      currentUser = {
        uid: user.uid,
        email: user.email,
        name: displayName,
        role: '일반'
      };
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      document.getElementById('currentUserName').textContent = user.email || "-";
      currentUid = user.uid;
      currentUser = {
        uid: user.uid,
        email: user.email,
        name: user.email.split('@')[0],
        role: '일반'
      };
    }
    
    initializeScheduleData();
    
    checkFirstLogin(user.uid)
      .then(isFirstLogin => {
        if (isFirstLogin) {
          showChangePasswordModal();
        } else {
          showMainInterface();
        }
      })
      .catch(error => {
        console.error('최초 로그인 확인 오류:', error);
        showMainInterface();
      });
  } else {
    currentUser = null;
    currentUid = null;
    resetInterface();
  }
});

// Firebase 데이터 구조 확인 및 초기화
async function initializeScheduleData() {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    const userName = user.email.split('@')[0];
    const now = new Date().toISOString();
    
    await db.ref(`as-service/user_meta/${user.uid}`).update({
      email: user.email,
      userName: userName,
      lastLogin: now,
      uid: user.uid
    });
    
    console.log('사용자 메타 데이터 초기화 완료:', userName);
  } catch (error) {
    console.error('초기화 오류:', error);
  }
}

// 인터페이스 초기화
function resetInterface() {
  document.getElementById('loginModal').style.display = 'block';
  document.getElementById('sidebar').classList.add('hidden');
  document.getElementById('mainContainer').classList.add('hidden');
  
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPw').value = '';
  document.getElementById('loginError').textContent = '';
  
  asData = [];
  dataLoaded = false;
}

// 메인 인터페이스 표시
function showMainInterface() {
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('mainContainer').classList.remove('hidden');
  
  if (!dataLoaded) {
    testConnection();
    loadData();
    loadAiConfig();
    loadApiConfig();
    dataLoaded = true;
  }
}

// 로그인 수행
function performLogin() {
  const email = document.getElementById('loginUser').value.trim();
  const pw = document.getElementById('loginPw').value.trim();
  
  if (!email || !pw) {
    document.getElementById('loginError').textContent = "이메일과 비밀번호를 모두 입력하세요.";
    return;
  }
  
  if (!email.includes('@')) {
    document.getElementById('loginError').textContent = "올바른 이메일 형식을 입력해주세요.";
    return;
  }
  
  document.getElementById('loginError').textContent = "로그인 중...";
  
  auth.signInWithEmailAndPassword(email, pw)
    .then(async (userCredential) => {
      document.getElementById('loginError').textContent = "";
      
      const user = userCredential.user;
      const now = new Date().toISOString();
      
      const mainUsersSnapshot = await db.ref(mainUsersPath).once('value');
      const mainUsers = mainUsersSnapshot.val() || {};
      
      let userName = '';
      for (const uid in mainUsers) {
        if (mainUsers[uid].email === user.email) {
          userName = mainUsers[uid].id || '';
          break;
        }
      }
      
      if (!userName) {
        userName = user.email.split('@')[0];
      }
      
      await db.ref(`as-service/user_meta/${user.uid}`).update({
        lastLogin: now,
        email: user.email,
        uid: user.uid,
        userName: userName,
        lastLoginKST: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString()
      });
      
      console.log('로그인 및 메타 정보 업데이트 완료:', {
        uid: user.uid,
        email: user.email,
        userName: userName,
        lastLogin: now
      });
    })
    .catch(err => {
      console.error("로그인 오류:", err);
      
      let errorMsg = "로그인에 실패했습니다.";
      
      switch(err.code) {
        case 'auth/wrong-password':
          errorMsg = "비밀번호가 올바르지 않습니다.";
          break;
        case 'auth/user-not-found':
          errorMsg = "등록되지 않은 이메일입니다.";
          break;
        case 'auth/invalid-email':
          errorMsg = "유효하지 않은 이메일 형식입니다.";
          break;
        case 'auth/user-disabled':
          errorMsg = "비활성화된 계정입니다. 관리자에게 문의하세요.";
          break;
        case 'auth/too-many-requests':
          errorMsg = "너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.";
          break;
        default:
          errorMsg = "로그인 실패: " + err.message;
      }
      
      document.getElementById('loginError').textContent = errorMsg;
    });
}

// 로그아웃
function logoutUser() {
  if(confirm("로그아웃 하시겠습니까?")) {
    auth.signOut()
      .then(() => {
        console.log("로그아웃 완료");
      })
      .catch(err => {
        console.error("로그아웃 오류:", err);
        alert("로그아웃 중 오류가 발생했습니다.");
      });
  }
}

// 최초 로그인 여부 확인
async function checkFirstLogin(userId) {
  try {
    const snapshot = await db.ref(`${userMetaPath}/${userId}`).once('value');
    const userData = snapshot.val();
    
    if (!userData || !userData.lastLogin) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('최초 로그인 확인 중 오류:', error);
    throw error;
  }
}

// 로그인 기록 업데이트
async function updateLoginRecord(userId) {
  try {
    const now = new Date().toISOString();
    await db.ref(`${userMetaPath}/${userId}`).update({
      lastLogin: now,
      passwordChanged: true
    });
  } catch (error) {
    console.error('로그인 기록 업데이트 오류:', error);
    throw error;
  }
}

// 비밀번호 변경 모달 표시
function showChangePasswordModal(isFirstLogin = true) {
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  document.getElementById('changePasswordStatus').textContent = '';
  document.getElementById('changePasswordStatus').className = '';
  
  document.getElementById('changePasswordModal').setAttribute('data-first-login', isFirstLogin ? 'true' : 'false');
  document.getElementById('changePasswordModal').style.display = 'block';
  
  setTimeout(() => {
    document.getElementById('currentPassword').focus();
  }, 300);
}

// 비밀번호 변경 처리
async function changeUserPassword() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const statusElement = document.getElementById('changePasswordStatus');
  
  statusElement.textContent = '';
  statusElement.className = '';
  
  if (!currentPassword) {
    statusElement.textContent = '현재 비밀번호를 입력해주세요.';
    statusElement.className = 'error';
    document.getElementById('currentPassword').focus();
    return;
  }
  
  if (!newPassword) {
    statusElement.textContent = '새 비밀번호를 입력해주세요.';
    statusElement.className = 'error';
    document.getElementById('newPassword').focus();
    return;
  }
  
  if (!confirmPassword) {
    statusElement.textContent = '새 비밀번호 확인을 입력해주세요.';
    statusElement.className = 'error';
    document.getElementById('confirmPassword').focus();
    return;
  }
  
  if (newPassword !== confirmPassword) {
    statusElement.textContent = '새 비밀번호가 일치하지 않습니다.';
    statusElement.className = 'error';
    document.getElementById('confirmPassword').focus();
    return;
  }
  
  if (newPassword.length < 6) {
    statusElement.textContent = '비밀번호는 6자 이상이어야 합니다.';
    statusElement.className = 'error';
    document.getElementById('newPassword').focus();
    return;
  }
  
  if (currentPassword === newPassword) {
    statusElement.textContent = '현재 비밀번호와 새 비밀번호가 같습니다.';
    statusElement.className = 'error';
    document.getElementById('newPassword').focus();
    return;
  }
  
  statusElement.textContent = '비밀번호 변경 중...';
  
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('로그인된 사용자가 없습니다.');
    }
    
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email,
      currentPassword
    );
    
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPassword);
    await updateLoginRecord(user.uid);
    
    statusElement.textContent = '비밀번호가 성공적으로 변경되었습니다.';
    statusElement.className = 'success';
    
    setTimeout(() => {
      document.getElementById('changePasswordModal').style.display = 'none';
      
      if (document.getElementById('changePasswordModal').getAttribute('data-first-login') === 'true') {
        showMainInterface();
      }
    }, 2000);
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    let errorMsg = '비밀번호 변경 중 오류가 발생했습니다.';
    
    if (error.code === 'auth/wrong-password') {
      errorMsg = '현재 비밀번호가 올바르지 않습니다.';
      document.getElementById('currentPassword').focus();
    } else if (error.code === 'auth/weak-password') {
      errorMsg = '새 비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.';
      document.getElementById('newPassword').focus();
    } else if (error.code === 'auth/requires-recent-login') {
      errorMsg = '보안을 위해 재로그인이 필요합니다. 로그아웃 후 다시 로그인해주세요.';
      setTimeout(() => {
        auth.signOut().then(() => {
          alert('보안을 위해 재로그인이 필요합니다. 다시 로그인해주세요.');
        });
      }, 2000);
    }
    
    statusElement.textContent = errorMsg;
    statusElement.className = 'error';
  }
}

// 비밀번호 찾기 모달 열기
function openForgotPasswordModal(e) {
  if (e) e.preventDefault();
  const loginEmail = document.getElementById('loginUser').value.trim();
  document.getElementById('resetEmail').value = loginEmail;
  document.getElementById('resetEmailStatus').textContent = '';
  document.getElementById('resetEmailStatus').className = '';
  document.getElementById('forgotPasswordModal').style.display = 'block';
}

// 비밀번호 초기화 이메일 전송
function sendPasswordResetEmail() {
  const email = document.getElementById('resetEmail').value.trim();
  if (!email) {
    document.getElementById('resetEmailStatus').textContent = '이메일을 입력하세요.';
    document.getElementById('resetEmailStatus').className = 'error';
    return;
  }
  
  auth.sendPasswordResetEmail(email)
    .then(() => {
      document.getElementById('resetEmailStatus').textContent = '비밀번호 재설정 이메일을 발송했습니다. 이메일을 확인해주세요.';
      document.getElementById('resetEmailStatus').className = 'success';
      
      setTimeout(() => {
        closeForgotPasswordModal();
      }, 3000);
    })
    .catch((error) => {
      console.error('비밀번호 재설정 이메일 전송 오류:', error);
      let errorMsg = '이메일 전송 중 오류가 발생했습니다.';
      
      if (error.code === 'auth/user-not-found') {
        errorMsg = '해당 이메일로 등록된 사용자가 없습니다.';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = '유효하지 않은 이메일 형식입니다.';
      }
      
      document.getElementById('resetEmailStatus').textContent = errorMsg;
      document.getElementById('resetEmailStatus').className = 'error';
    });
}

// 비밀번호 찾기 모달 닫기
function closeForgotPasswordModal() {
  document.getElementById('forgotPasswordModal').style.display = 'none';
  document.getElementById('resetEmailStatus').textContent = '';
  document.getElementById('resetEmailStatus').className = '';
}

/** ==================================
 *  사용자 관리
 * ===================================*/
function openUserModal() {
  db.ref(userPath).once('value').then(snap => {
    const val = snap.val() || {};
    userData = Object.entries(val).map(([k, v]) => ({uid: k, ...v}));
    renderUserList();
    document.getElementById('userModal').style.display = 'block';
  });
}

function renderUserList() {
  const listDiv = document.getElementById('userList');
  listDiv.innerHTML = '';
  userData.forEach(u => {
    const row = document.createElement('div');
    row.style.marginBottom = '4px';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.dataset.uid = u.uid;
    chk.style.marginRight = '6px';
    row.appendChild(chk);

    const txt = document.createElement('span');
    txt.textContent = `사용자명: ${u.username}, 비번: ${u.password}`;
    row.appendChild(txt);

    listDiv.appendChild(row);
  });
}

function closeUserModal() {
  document.getElementById('userModal').style.display = 'none';
}

function deleteSelectedUsers() {
  const cks = document.querySelectorAll('#userList input[type=checkbox]:checked');
  if (!cks.length) {
    alert("삭제할 사용자를 선택하세요.");
    return;
  }
  if (!confirm("선택한 사용자들을 삭제하시겠습니까?")) return;

  const updates = {};
  cks.forEach(chk => {
    const uid = chk.dataset.uid;
    updates[uid] = null;
  });

  db.ref(userPath).update(updates)
    .then(() => {
      return db.ref(userPath).once('value');
    })
    .then(snap => {
      const val = snap.val() || {};
      userData = Object.entries(val).map(([k, v]) => ({uid: k, ...v}));
      renderUserList();
    });
}

function addNewUser() {
  const uname = document.getElementById('newUserName').value.trim();
  const upw = document.getElementById('newUserPw').value.trim();
  if (!uname || !upw) {
    alert("사용자명/비번 필수 입력");
    return;
  }
  
  const email = uname.includes('@') ? uname : `${uname}@snsys.com`;
  
  auth.createUserWithEmailAndPassword(email, upw)
    .then((userCredential) => {
      const user = userCredential.user;
      
      return db.ref(`${userPath}/${user.uid}`).set({
        username: uname,
        password: upw,
        email: email,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
    })
    .then(() => {
      alert("사용자 등록 완료");
      document.getElementById('newUserName').value = '';
      document.getElementById('newUserPw').value = '';
      return db.ref(userPath).once('value');
    })
    .then(snap => {
      const val = snap.val() || {};
      userData = Object.entries(val).map(([k, v]) => ({uid: k, ...v}));
      renderUserList();
    })
    .catch((error) => {
      console.error("사용자 추가 오류:", error);
      alert("사용자 추가 실패: " + error.message);
    });
}

/** ==================================
 *  AI 설정 관리
 * ===================================*/
function openAiConfigModal() {
  document.getElementById('aiApiKey').value = g_aiConfig.apiKey || "";
  document.getElementById('aiModel').value = g_aiConfig.model || "";
  document.getElementById('aiPromptRow').value = g_aiConfig.promptRow || "";
  document.getElementById('aiPromptHistory').value = g_aiConfig.promptHistory || "";
  document.getElementById('aiPromptOwner').value = g_aiConfig.promptOwner || "";

  document.getElementById('aiConfigModal').style.display = 'block';
}

async function saveAiConfig() {
  const newConfig = {
    apiKey: document.getElementById('aiApiKey').value.trim(),
    model: document.getElementById('aiModel').value.trim(),
    promptRow: document.getElementById('aiPromptRow').value,
    promptHistory: document.getElementById('aiPromptHistory').value,
    promptOwner: document.getElementById('aiPromptOwner').value
  };
  await db.ref(aiConfigPath).set(newConfig);
  alert("AI 설정이 저장되었습니다.");
  g_aiConfig = newConfig;
  document.getElementById('aiConfigModal').style.display = 'none';
}

async function loadAiConfig() {
  const snap = await db.ref(aiConfigPath).once('value');
  if (snap.exists()) {
    g_aiConfig = snap.val();
  }
}

/** ==================================
 *  API 설정 관리
 * ===================================*/
function openApiConfigModal() {
  document.getElementById('vesselfinder_apikey').value = g_apiConfig.apiKey || "";
  document.getElementById('vesselfinder_baseurl').value = g_apiConfig.baseUrl || "https://api.vesselfinder.com/masterdata";

  checkApiCreditStatus();
  
  document.getElementById('apiConfigModal').style.display = 'block';
}

function closeApiConfigModal() {
  document.getElementById('apiConfigModal').style.display = 'none';
}

async function saveApiConfig() {
  const newConfig = {
    apiKey: document.getElementById('vesselfinder_apikey').value.trim(),
    baseUrl: document.getElementById('vesselfinder_baseurl').value.trim()
  };
  await db.ref(apiConfigPath).set(newConfig);
  alert("API 설정이 저장되었습니다.");
  g_apiConfig = newConfig;
  document.getElementById('apiConfigModal').style.display = 'none';
}

async function loadApiConfig() {
  const snap = await db.ref(apiConfigPath).once('value');
  if (snap.exists()) {
    g_apiConfig = snap.val();
  }
}

async function checkApiCreditStatus() {
  const statusElem = document.getElementById('apiCreditStatus');
  statusElem.textContent = "API 상태 확인 중...";
  
  const apiKey = document.getElementById('vesselfinder_apikey').value.trim() || g_apiConfig.apiKey;
  
  if (!apiKey) {
    statusElem.textContent = "API Key가 설정되지 않았습니다.";
    return;
  }
  
  try {
    const corsProxy = "https://api.allorigins.win/raw?url=";
    const targetUrl = `https://api.vesselfinder.com/status?userkey=${apiKey}`;
    const statusUrl = `${corsProxy}${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(statusUrl);
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      statusElem.innerHTML = `<p>JSON 파싱 오류: ${e.message}</p><p>원본 응답: ${responseText}</p>`;
      return;
    }
    
    if (data.error) {
      statusElem.textContent = `오류: ${data.error}`;
      return;
    }
    
    if (data.CREDITS !== undefined) {
      const credits = data.CREDITS;
      const expirationDate = data.EXPIRATION_DATE || 'N/A';
      
      statusElem.innerHTML = `
        <div style="margin-top:10px;">
          <p><strong>남은 크레딧:</strong> ${credits}</p>
          <p><strong>만료일:</strong> ${expirationDate}</p>
        </div>
      `;
    } else if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      
      if (firstItem.CREDITS !== undefined) {
        const credits = firstItem.CREDITS;
        const expirationDate = firstItem.EXPIRATION_DATE || 'N/A';
        
        statusElem.innerHTML = `
          <div style="margin-top:10px;">
            <p><strong>남은 크레딧:</strong> ${credits}</p>
            <p><strong>만료일:</strong> ${expirationDate}</p>
          </div>
        `;
      } else {
        statusElem.innerHTML = `<p>예상치 못한 응답 형식입니다: ${JSON.stringify(data)}</p>`;
      }
    } else if (data.STATUS) {
      const status = data.STATUS;
      const credits = status.CREDITS || status.credits || 'N/A';
      const expirationDate = status.EXPIRATION_DATE || status.expiration_date || 'N/A';
      
      statusElem.innerHTML = `
        <div style="margin-top:10px;">
          <p><strong>남은 크레딧:</strong> ${credits}</p>
          <p><strong>만료일:</strong> ${expirationDate}</p>
        </div>
      `;
    } else {
      statusElem.innerHTML = `
        <p>응답을 해석할 수 없습니다. 원본 응답:</p>
        <pre style="max-height:150px;overflow:auto;background:#f5f5f5;padding:5px;font-size:0.8em;">${JSON.stringify(data, null, 2)}</pre>
      `;
    }
    
  } catch (error) {
    console.error("API 상태 확인 오류:", error);
    statusElem.textContent = `API 상태 확인 중 오류가 발생했습니다: ${error.message}`;
  }
}

/** ==================================
 *  API 진행 상황 모달
 * ===================================*/
function showApiProgressModal() {
  document.getElementById('apiProgressText').textContent = "데이터 요청 중...";
  document.getElementById('apiProgressModal').style.display = 'block';
}

function updateApiProgressText(text) {
  const div = document.getElementById('apiProgressText');
  div.textContent += "\n" + text;
  div.scrollTop = div.scrollHeight;
}

function clearApiProgressText() {
  document.getElementById('apiProgressText').textContent = "";
}

function closeApiProgressModal() {
  document.getElementById('apiProgressModal').style.display = 'none';
}

/** ==================================
 *  AI 실시간 진행 모달
 * ===================================*/
function showAiProgressModal() {
  document.getElementById('aiProgressText').textContent = "요약 요청 중...";
  const modal = document.getElementById('aiProgressModal');
  modal.style.display = 'block';
  modal.style.zIndex = '10015';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.background = 'rgba(0, 0, 0, 0.8)';
  modal.style.backdropFilter = 'blur(4px)';
}

function updateAiProgressText(chunk) {
  const div = document.getElementById('aiProgressText');
  div.textContent += chunk;
  div.scrollTop = div.scrollHeight;
}

function clearAiProgressText() {
  document.getElementById('aiProgressText').textContent = "";
}

function closeAiProgressModal() {
  document.getElementById('aiProgressModal').style.display = 'none';
}

/** ==================================
 *  데이터 관리 및 테이블 기능
 * ===================================*/
function testConnection() {
  db.ref('test').set({time: Date.now()})
    .then(() => {
      document.getElementById('connectionStatus').textContent = "연결 상태: Firebase 연결됨";
      document.getElementById('connectionStatus').style.color = "green";
    })
    .catch(err => {
      document.getElementById('connectionStatus').textContent = "연결 오류:" + err.message;
      document.getElementById('connectionStatus').style.color = "red";
    });
}

async function loadData() {
  const snap = await db.ref(asPath).once('value');
  const val = snap.val() || {};

  asData = [];
  Object.keys(val).forEach(key => {
    const r = val[key];

    // 빈 객체이거나 유효하지 않은 데이터는 건너뛰기
    if (!r || typeof r !== 'object') return;

    // 최소한 하나 이상의 필수 필드가 있는지 확인
    const hasRequiredFields = r.공번 || r.imo || r.hull || r.shipName || r.manager || r.shipowner;
    if (!hasRequiredFields) return;

    // uid가 없으면 key를 uid로 설정
    if (!r.uid) r.uid = key;

    // 호환 처리
    if (r["현 담당"] && !r.manager) r.manager = r["현 담당"];
    if (r["SHIPOWNER"] && !r.shipowner) r.shipowner = r["SHIPOWNER"];
    if (r.group && typeof r.group !== 'string') r.group = String(r.group);
    if (!("AS접수일자" in r)) r["AS접수일자"] = "";
    if (!("정상지연" in r)) r["정상지연"] = "";
    if (!("지연 사유" in r)) r["지연 사유"] = "";
    if (!("수정일" in r)) r["수정일"] = "";
    if (!("api_name" in r)) r["api_name"] = "";
    if (!("api_owner" in r)) r["api_owner"] = "";
    if (!("api_manager" in r)) r["api_manager"] = "";
    if (!("현황번역" in r)) r["현황번역"] = "";

    // 동작여부 값 변환
    if (r.동작여부 === "정상A" || r.동작여부 === "정상B" || r.동작여부 === "유상정상") {
      r.동작여부 = "정상";
    }

    asData.push(r);
  });

  console.log(`데이터 로드 완료: 총 ${asData.length}개 (원본: ${Object.keys(val).length}개)`);

  await loadHistoryCounts();

  dataLoaded = true;
  updateSidebarList();
  applyFilters();
}

// 히스토리 건수 로드
async function loadHistoryCounts() {
  const tasks = asData.map(row =>
    getProjectHistoryRef(row.공번).once('value').then(snapshot => {
      const data = snapshot.val() || {};
      const perYear = {};
      let total = 0;
      Object.values(data).forEach(rec => {
        if (!rec.AS접수일자) return;
        const year = parseInt(rec.AS접수일자.substring(0, 4), 10);
        if (year >= 2020) {
          perYear[year] = (perYear[year] || 0) + 1;
          total++;
        }
      });
      row.historyCounts = { perYear, total };
    }).catch(err => {
      console.error('히스토리 건수 로드 오류:', err);
      row.historyCounts = { perYear: {}, total: 0 };
    })
  );
  await Promise.all(tasks);
}

// onCellChange 함수
function onCellChange(e) {
  const uid = e.target.dataset.uid;
  const field = e.target.dataset.field;
  let newVal = "";
  
  if (e.target.type === 'checkbox') {
    newVal = e.target.checked ? "Y" : "";
  } else {
    newVal = e.target.value;
  }
  
  const row = asData.find(x => x.uid === uid);
  if (!row) return;
  
  const oldVal = row[field] || '';
  if (oldVal === newVal) return;
  
  row[field] = newVal;
  
  const now = new Date().toISOString().split('T')[0];
  row["수정일"] = now;
  
  modifiedRows.add(uid);
  
  if (field === "현황") {
    row.현황번역 = "";
    
    const translationCell = e.target.closest('tr').querySelector('td[data-field="현황번역"] input');
    if (translationCell) {
      translationCell.value = "";
    }
  }
  
  if (field === "정상지연" || field === "AS접수일자" || field === "기술적종료일") {
    updateElapsedDaysForRow(e.target.closest('tr'), row);
    updateElapsedDayCounts();
  }
}

// 경과일 실시간 업데이트
function updateElapsedDaysForRow(tr, rowData) {
  const elapsedCell = tr.querySelector('td[data-field="경과일"]');
  if (!elapsedCell) return;
  
  if (rowData["기술적종료일"]) {
    elapsedCell.textContent = "";
    elapsedCell.style.backgroundColor = '';
    elapsedCell.style.color = '';
  } else {
    let asDate = rowData["AS접수일자"] || "";
    if (!asDate) {
      elapsedCell.textContent = "";
      elapsedCell.style.backgroundColor = '';
      elapsedCell.style.color = '';
    } else {
      const today = new Date();
      const asD = new Date(asDate + "T00:00");
      if (asD.toString() === 'Invalid Date') {
        elapsedCell.textContent = "";
        elapsedCell.style.backgroundColor = '';
        elapsedCell.style.color = '';
      } else {
        const diff = Math.floor((today - asD) / (1000 * 3600 * 24));
        if (diff < 0) {
          elapsedCell.textContent = "0일";
        } else {
          elapsedCell.textContent = diff + "일";
          if (!rowData["정상지연"]) {
            if (diff >= 90) {
              elapsedCell.style.backgroundColor = 'red';
              elapsedCell.style.color = '#fff';
            } else if (diff >= 60) {
              elapsedCell.style.backgroundColor = 'orange';
              elapsedCell.style.color = '';
            } else if (diff >= 30) {
              elapsedCell.style.backgroundColor = 'yellow';
              elapsedCell.style.color = '';
            } else {
              elapsedCell.style.backgroundColor = '';
              elapsedCell.style.color = '';
            }
          } else {
            elapsedCell.style.backgroundColor = '';
            elapsedCell.style.color = '';
          }
        }
      }
    }
  }
}

// 데이터 저장
function saveAllData() {
  if (modifiedRows.size === 0) {
    alert("수정된 내용이 없습니다.");
    return;
  }
  
  if (!confirm(`수정된 ${modifiedRows.size}개 항목을 저장하시겠습니까?`)) return;
  
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "저장 중...";
  saveBtn.disabled = true;
  
  const updates = {};
  modifiedRows.forEach(uid => {
    const row = asData.find(r => r.uid === uid);
    if (row) {
      updates[uid] = row;
    }
  });
  
  db.ref(asPath).update(updates)
    .then(() => {
      const count = modifiedRows.size;
      modifiedRows.clear();
      
      alert(`${count}개 항목 저장 완료`);
      addHistory(`수정된 ${count}개 항목 저장`);
      
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
      
      saveBtn.classList.add('save-success');
      setTimeout(() => {
        saveBtn.classList.remove('save-success');
      }, 1000);
    })
    .catch(err => {
      alert("저장 중 오류 발생: " + err.message);
      console.error("저장 오류:", err);
      
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    });
}

// 새 행 추가
function addNewRow() {
  const uid = db.ref().push().key;
  const now = new Date().toISOString().split('T')[0];
  const obj = {
    uid,
    공번: '', 공사: '', imo: '', hull: '', shipName: '', repMail: '',
    shipType: '', scale: '', 구분: '', shipowner: '', major: '', group: '',
    shipyard: '', contract: '', asType: '유상', delivery: '', warranty: '',
    prevManager: '', manager: '', 현황: '', 현황번역: '', 동작여부: '정상',
    조치계획: '', 접수내용: '', 조치결과: '',
    "AS접수일자": '',
    "기술적종료일": '',
    "정상지연": '',
    "지연 사유": '',
    "수정일": now,
    "api_name": '',
    "api_owner": '',
    "api_manager": ''
  };
  
  asData.unshift(obj);
  modifiedRows.add(uid);
  
  // 새 행 추가 후 전체 데이터 표시
  clearAllFilters();
  loadAllData();
}

// 선택 행 삭제
async function deleteSelectedRows() {
  const cks = document.querySelectorAll('.rowSelectChk:checked');
  if (!cks.length) {
    alert("삭제할 행을 선택하세요.");
    return;
  }
  if (!confirm("정말 삭제하시겠습니까?")) return;
  
  const uidsToDelete = Array.from(cks).map(chk => chk.dataset.uid);
  
  try {
    // Firebase에서 삭제할 항목들을 null로 설정
    const updates = {};
    uidsToDelete.forEach(uid => {
      updates[`${asPath}/${uid}`] = null;
    });
    
    // Firebase에 삭제 반영
    await db.ref().update(updates);
    
    // 로컬 데이터에서도 삭제
    asData = asData.filter(x => !uidsToDelete.includes(x.uid));
    
    // 필터링된 데이터에서도 삭제
    if (filteredData.length > 0) {
      filteredData = filteredData.filter(x => !uidsToDelete.includes(x.uid));
    }
    
    // 체크박스 초기화
    document.getElementById('selectAll').checked = false;
    
    // 테이블 업데이트
    updateTable();
    
    // 사이드바 업데이트
    updateSidebarList();
    
    // 히스토리 추가
    addHistory(`${uidsToDelete.length}개 항목 삭제`);
    
    alert(`${uidsToDelete.length}개 항목이 삭제되었습니다.`);
    
  } catch (error) {
    console.error("삭제 중 오류 발생:", error);
    alert("삭제 중 오류가 발생했습니다: " + error.message);
    
    // 오류 발생 시 데이터 다시 로드
    loadData();
  }
}

// 모든 체크박스 선택/해제
function toggleSelectAll(e) {
  const cks = document.querySelectorAll('.rowSelectChk');
  cks.forEach(c => c.checked = e.target.checked);
}

// 테이블 클릭 이벤트 핸들러
function handleTableClick(e) {
  if ((e.target.tagName === 'TH' || e.target.closest('th')) && !e.target.classList.contains('col-resizer')) {
    const th = e.target.tagName === 'TH' ? e.target : e.target.closest('th');
    const field = th.dataset.field;
    
    if (!field) return;
    
    document.querySelectorAll('th .sort-indicator').forEach(indicator => {
      indicator.remove();
    });
    
    if (sortField === field) {
      sortAsc = !sortAsc;
    } else {
      sortField = field;
      sortAsc = true;
    }
    
    const sortIndicator = document.createElement('span');
    sortIndicator.className = 'sort-indicator';
    sortIndicator.innerHTML = sortAsc ? ' &#9650;' : ' &#9660;';
    th.appendChild(sortIndicator);
    
    // 현재 표시된 데이터에 정렬 적용
    if (filteredData.length > 0) {
      applySorting();
      updateTable();
    }
  }
}

// 상태 카드 업데이트 시 선택 상태 표시
function updateStatusCounts(counts) {
  document.getElementById('count정상').textContent = counts.정상 || 0;
  document.getElementById('count부분동작').textContent = counts.부분동작 || 0;
  document.getElementById('count동작불가').textContent = counts.동작불가 || 0;
  
  // 현재 선택된 동작여부 하이라이트
  const currentStatus = document.getElementById('filterActive').value;
  document.querySelectorAll('.status-card').forEach((card, index) => {
    if (index < 3) { // 처음 3개가 동작여부 카드
      card.classList.remove('active-filter');
    }
  });
  
  if (currentStatus === '정상') {
    document.getElementById('count정상').parentElement.classList.add('active-filter');
  } else if (currentStatus === '부분동작') {
    document.getElementById('count부분동작').parentElement.classList.add('active-filter');
  } else if (currentStatus === '동작불가') {
    document.getElementById('count동작불가').parentElement.classList.add('active-filter');
  }
}


// 경과일 카운트 업데이트 시 선택 상태 표시
function updateElapsedDayCounts() {
  const today = new Date();
  let count30Days = 0, count60Days = 0, count90Days = 0;
  
  const dataToCount = filteredData.length > 0 ? filteredData : [];
  
  dataToCount.forEach(row => {
    if (row["기술적종료일"]) return;
    if (!row["AS접수일자"]) return;
    
    const asDate = new Date(row["AS접수일자"] + "T00:00");
    if (isNaN(asDate.getTime())) return;
    
    const diffDays = Math.floor((today - asDate) / (1000 * 3600 * 24));
    
    if (diffDays >= 90) count90Days++;
    else if (diffDays >= 60) count60Days++;
    else if (diffDays >= 30) count30Days++;
  });
  
  document.getElementById('count30Days').textContent = count30Days;
  document.getElementById('count60Days').textContent = count60Days;
  document.getElementById('count90Days').textContent = count90Days;
  
  // 현재 선택된 경과일 하이라이트
  document.querySelectorAll('.elapsed-card').forEach(card => {
    card.classList.remove('active-filter');
  });
  
  if (window.elapsedDayFilter === 30) {
    document.getElementById('count30Days').parentElement.classList.add('active-filter');
  } else if (window.elapsedDayFilter === 60) {
    document.getElementById('count60Days').parentElement.classList.add('active-filter');
  } else if (window.elapsedDayFilter === 90) {
    document.getElementById('count90Days').parentElement.classList.add('active-filter');
  }
}
// 테이블 행 생성
// 테이블 행 생성
function createTableRow(row) {
  const tr = document.createElement('tr');
  
  const columnsToShow = isExtendedView ? allColumns : basicColumns;

  columnsToShow.forEach(columnKey => {
    try {
      const td = createTableCell(row, columnKey);
      if (td) {
        tr.appendChild(td);
      } else {
        // td가 null인 경우 빈 셀 추가
        const emptyTd = document.createElement('td');
        tr.appendChild(emptyTd);
      }
    } catch (error) {
      console.error(`Error creating cell for column ${columnKey}:`, error);
      // 에러 발생 시 빈 셀 추가
      const emptyTd = document.createElement('td');
      tr.appendChild(emptyTd);
    }
  });

  // 보증종료일 강조
  if (row.warranty) {
    const wDate = new Date(row.warranty + "T00:00");
    const today = new Date(new Date().toLocaleDateString());
    if (wDate < today && (row.asType === '무상' || row.asType === '위탁')) {
      const asCells = tr.querySelectorAll('td');
      asCells.forEach(cell => {
        const select = cell.querySelector('select[data-field="asType"]');
        if (select) {
          cell.style.backgroundColor = 'yellow';
        }
      });
    }
  }
  
  // 동작여부 셀 강조
  const activeCell = tr.querySelector('td[data-field="동작여부"]');
  if (activeCell) {
    if (row.기술적종료일 && ["부분동작", "동작불가"].includes(row.동작여부)) {
      activeCell.style.backgroundColor = 'yellow';
    }
    if (row.접수내용 && !row.기술적종료일 && row.동작여부 === "정상") {
      activeCell.style.backgroundColor = 'lightgreen';
    }
  }

  return tr;
}

// 테이블 셀 생성
// 테이블 셀 생성
// 테이블 셀 생성
function createTableCell(row, columnKey) {
  // columnKey가 undefined인 경우 빈 셀 반환
  if (!columnKey) {
    const td = document.createElement('td');
    return td;
  }
  
  switch (columnKey) {
    case 'checkbox':
      return createCheckboxCell(row);
    case 'api_apply':
      return createApiApplyCell(row);
    case 'ai_summary':
      // AI 요약 버튼 직접 생성
      const aiTd = document.createElement('td');
      const aiBtn = document.createElement('button');
      aiBtn.textContent = translations[currentLanguage]["AI 요약"] || "AI 요약";
      aiBtn.style.cssText = 'background: #6c757d; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;';
      aiBtn.addEventListener('click', () => summarizeAndUpdateRow(row.uid));
      aiTd.appendChild(aiBtn);
      return aiTd;
    case 'historyCount':
      return createHistoryCountCell(row);
    case 'history':
      return createHistoryCell(row);
    case '경과일':
      return createElapsedDaysCell(row);
    case '정상지연':
      return createNormalDelayCell(row);
    case '수정일':
      return createModifiedDateCell(row);
    default:
      if (columnKey.startsWith('historyCount')) {
        const year = parseInt(columnKey.replace('historyCount', ''), 10);
        if (!isNaN(year)) {
          return createHistoryYearCell(row, year);
        }
      }
      // 알려진 컬럼인지 확인
      const knownColumns = [
        '공번', '공사', 'imo', 'api_name', 'api_owner', 'api_manager',
        'hull', 'shipName', 'repMail', 'shipType', 'scale', '구분',
        'shipowner', 'major', 'group', 'shipyard', 'contract', 'asType',
        'delivery', 'warranty', 'prevManager', 'manager', '현황', '현황번역',
        '동작여부', '조치계획', '접수내용', '조치결과', 'AS접수일자', '기술적종료일',
        '지연 사유'
      ];
      
      if (knownColumns.includes(columnKey)) {
        return createDataCell(row, columnKey);
      } else {
        // 알 수 없는 컬럼은 빈 셀 반환
        const td = document.createElement('td');
        console.warn(`Unknown column key: ${columnKey}`);
        return td;
      }
  }
}
// 체크박스 셀 생성
function createCheckboxCell(row) {
  const td = document.createElement('td');
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.classList.add('rowSelectChk');
  chk.dataset.uid = row.uid;
  td.appendChild(chk);
  return td;
}

// API 반영 버튼 셀 생성
function createApiApplyCell(row) {
  const td = document.createElement('td');
  const btn = document.createElement('button');
  btn.textContent = translations[currentLanguage]["반영"] || "반영";
  btn.style.background = "#28a745";
  btn.style.color = "#fff";
  btn.style.cursor = "pointer";
  btn.style.border = "none";
  btn.style.borderRadius = "4px";
  btn.style.padding = "4px 8px";
  btn.addEventListener('click', () => fetchAndUpdateVesselData(row.uid));
  td.appendChild(btn);
  return td;
}

// AI 요약 버튼 셀 생성
function createAiSummaryCell(row) {
  const td = document.createElement('td');
  const btn = document.createElement('button');
  btn.textContent = translations[currentLanguage]["AI 요약"] || "AI 요약";
  btn.style.background = "#6c757d";
  btn.style.color = "#fff";
  btn.style.cursor = "pointer";
  btn.addEventListener('click', () => summarizeAndUpdateRow(row.uid));
  td.appendChild(btn);
  return td;
}

// 히스토리 버튼 셀 생성
function createHistoryCell(row) {
  const td = document.createElement('td');
  const btn = document.createElement('button');
  btn.textContent = "조회";
  btn.style.background = "#007bff";
  btn.style.color = "#fff";
  btn.style.cursor = "pointer";
  btn.addEventListener('click', () => showHistoryDataWithFullscreen(row.공번));
  td.appendChild(btn);
  return td;
}

// 히스토리 건수 셀 생성
function createHistoryCountCell(row) {
  const td = document.createElement('td');
  td.dataset.field = 'historyCount';
  const counts = row.historyCounts || { perYear: {}, total: 0 };
  td.textContent = counts.total || 0;
  return td;
}

// 연도별 히스토리 건수 셀 생성
function createHistoryYearCell(row, year) {
  const td = document.createElement('td');
  td.dataset.field = `historyCount${year}`;
  const counts = row.historyCounts || { perYear: {}, total: 0 };
  td.textContent = counts.perYear[year] || 0;
  return td;
}

// 히스토리 데이터를 전체화면으로 표시
function showHistoryDataWithFullscreen(project) {
  showHistoryData(project);
  setTimeout(() => {
    const historyModal = document.getElementById('historyDataModal');
    if (historyModal) {
      historyModal.classList.add('fullscreen');
    }
  }, 100);
}

// 경과일 셀 생성
function createElapsedDaysCell(row) {
  const td = document.createElement('td');
  td.dataset.field = "경과일";
  
  if (row["기술적종료일"]) {
    td.textContent = "";
  } else {
    let asDate = row["AS접수일자"] || "";
    if (!asDate) {
      td.textContent = "";
    } else {
      const today = new Date();
      const asD = new Date(asDate + "T00:00");
      if (asD.toString() === 'Invalid Date') {
        td.textContent = "";
      } else {
        const diff = Math.floor((today - asD) / (1000 * 3600 * 24));
        if (diff < 0) {
          td.textContent = "0일";
        } else {
          td.textContent = diff + "일";
          if (!row["정상지연"]) {
            if (diff >= 90) {
              td.style.backgroundColor = 'red';
              td.style.color = '#fff';
            } else if (diff >= 60) {
              td.style.backgroundColor = 'orange';
            } else if (diff >= 30) {
              td.style.backgroundColor = 'yellow';
            }
          }
        }
      }
    }
  }
  return td;
}

// 정상지연 체크박스 셀 생성
function createNormalDelayCell(row) {
  const td = document.createElement('td');
  td.dataset.field = "정상지연";
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.dataset.uid = row.uid;
  check.dataset.field = "정상지연";
  check.checked = (row["정상지연"] === "Y");
  check.addEventListener('change', onCellChange);
  td.appendChild(check);
  return td;
}

// 수정일 셀 생성
function createModifiedDateCell(row) {
  const td = document.createElement('td');
  td.dataset.field = "수정일";
  td.textContent = row["수정일"] || "";
  td.style.backgroundColor = '#f8f9fa';
  td.style.color = '#6c757d';
  td.style.fontSize = '0.9em';
  return td;
}

// 일반 데이터 셀 생성
function createDataCell(row, field) {
  const td = document.createElement('td');
  td.dataset.field = field;
  
  const value = row[field] || '';
  
  if (['delivery', 'warranty', '기술적종료일', 'AS접수일자'].includes(field)) {
    const inp = document.createElement('input');
    inp.type = 'date';
    inp.value = value;
    inp.dataset.uid = row.uid;
    inp.dataset.field = field;
    inp.addEventListener('change', onCellChange);
    td.appendChild(inp);
  } else if (field === 'asType') {
    const sel = document.createElement('select');
    ['유상', '무상', '위탁'].forEach(op => {
      const o = document.createElement('option');
      o.value = op;
      o.textContent = op;
      sel.appendChild(o);
    });
    sel.value = value || '유상';
    sel.dataset.uid = row.uid;
    sel.dataset.field = field;
    sel.addEventListener('change', onCellChange);
    td.appendChild(sel);
  } else if (field === '동작여부') {
    const sel = document.createElement('select');
    ['정상', '부분동작', '동작불가'].forEach(op => {
      const o = document.createElement('option');
      o.value = op;
      o.textContent = op;
      sel.appendChild(o);
    });
    sel.value = value || '정상';
    sel.dataset.uid = row.uid;
    sel.dataset.field = field;
    sel.addEventListener('change', onCellChange);
    td.appendChild(sel);
  } else if (field === 'imo') {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = value;
    inp.style.width = '60%';
    inp.dataset.uid = row.uid;
    inp.dataset.field = field;
    inp.addEventListener('change', onCellChange);
    td.appendChild(inp);

    const linkIcon = document.createElement('span');
    linkIcon.textContent = ' 🔎';
    linkIcon.style.cursor = 'pointer';
    linkIcon.title = '새 창에서 조회';
    linkIcon.addEventListener('click', () => {
      const imoVal = inp.value.trim();
      if (imoVal) {
        window.open('https://www.vesselfinder.com/vessels/details/' + encodeURIComponent(imoVal), '_blank');
      }
    });
    td.appendChild(linkIcon);

    const pdfIcon = document.createElement('span');
    pdfIcon.textContent = ' 📄';
    pdfIcon.style.cursor = 'pointer';
    pdfIcon.title = 'PDF 도면 열기';
    pdfIcon.style.marginLeft = '5px';
    pdfIcon.addEventListener('click', () => {
      const imoVal = inp.value.trim();
      if (imoVal) {
        openPdfDrawing(imoVal);
      }
    });
    td.appendChild(pdfIcon);
  } else if (['조치계획', '접수내용', '조치결과'].includes(field)) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = value;
    inp.style.width = '95%';
    inp.readOnly = true;
    inp.dataset.uid = row.uid;
    inp.dataset.field = field;
    td.addEventListener('click', () => openContentModalAsWindow(value));
    td.appendChild(inp);
  } else if (['api_name', 'api_owner', 'api_manager'].includes(field)) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = value;
    inp.style.width = '95%';
    inp.readOnly = true;
    inp.dataset.uid = row.uid;
    inp.dataset.field = field;
    td.appendChild(inp);
  } else if (field === '현황번역') {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = value;
    inp.style.width = '95%';
    inp.readOnly = true;
    inp.dataset.uid = row.uid;
    inp.dataset.field = field;
    td.appendChild(inp);
  } else if (field === '지연 사유') {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = value;
    inp.style.width = '95%';
    inp.dataset.uid = row.uid;
    inp.dataset.field = field;
    inp.addEventListener('change', onCellChange);
    td.appendChild(inp);
  } else {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = value;
    inp.style.width = '95%';
    inp.dataset.uid = row.uid;
    inp.dataset.field = field;
    inp.addEventListener('change', onCellChange);
    td.appendChild(inp);
  }
  
  return td;
}

/** ==================================
 *  PDF 파일 열기 기능 - 파일 탐색기에서 열기
 * ===================================*/
function openPdfDrawing(imoNo) {
  if (!imoNo) {
    alert('IMO 번호가 없습니다.');
    return;
  }
  
  // 서버 경로 설정
  const serverPath = '\\\\10.101.10.20\\32.고객관리\\CS_박용\\9.개인폴더\\이제창\\FINAL DRAWING';
  const fileName = `${imoNo}.pdf`;
  const fullPath = `${serverPath}\\${fileName}`;
  
  // 바로 파일 탐색기로 폴더 열기 시도
  openFolderInExplorer();
  
function openFolderInExplorer() {
  try {
    // 폴더 경로와 파일명을 함께 복사 (전체 경로)
    copyToClipboard(fullPath);
    
    // 파일명도 별도로 저장
    sessionStorage.setItem('pdfFileName', fileName);
    
    // 안내 모달 표시
    showExplorerInstructions(serverPath, fileName, fullPath);
    
  } catch (e) {
    console.error('폴더 열기 실패:', e);
    // 실패 시에도 전체 경로 복사
    copyToClipboard(fullPath);
    showDetailedInstructions(fullPath);
  }
}
  
  // 파일 탐색기 안내 모달
function showExplorerInstructions(folderPath, fileName, fullPath) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 35px;
      border-radius: 12px;
      max-width: 600px;
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4);
      animation: modalSlideIn 0.3s ease-out;
    `;
    
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '확인';
    confirmBtn.style.cssText = `
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 30px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
      font-weight: 600;
      transition: all 0.3s ease;
    `;
    confirmBtn.onclick = function() {
      modal.remove();
    };
    
    content.innerHTML = `
      <h3 style="margin-top:0; color:#28a745; font-size:1.5em;">📁 파일 탐색기에서 PDF 파일 열기</h3>
      
      <div style="background:#f0f8ff; padding:20px; border-radius:8px; margin:20px 0; border-left:4px solid #007bff;">
<p style="font-size:1.1em; margin:0 0 15px 0; font-weight:600;">
  전체 파일 경로가 클립보드에 복사되었습니다!
        </p>
        <p style="margin:0; line-height:1.8;">
          1. <kbd style="background:#e0e0e0; padding:3px 8px; border-radius:3px; font-size:0.9em;">Win</kbd> + 
             <kbd style="background:#e0e0e0; padding:3px 8px; border-radius:3px; font-size:0.9em;">E</kbd> 키를 눌러 파일 탐색기를 엽니다<br>
          2. 주소창을 클릭하고 <kbd style="background:#e0e0e0; padding:3px 8px; border-radius:3px; font-size:0.9em;">Ctrl</kbd> + 
             <kbd style="background:#e0e0e0; padding:3px 8px; border-radius:3px; font-size:0.9em;">V</kbd>로 붙여넣기<br>
          3. <kbd style="background:#e0e0e0; padding:3px 8px; border-radius:3px; font-size:0.9em;">Enter</kbd> 키를 누릅니다<br>
4. 붙여넣기한 파일을 바로 열 수 있습니다
        </p>
      </div>
      
      <div style="background:#f8f9fa; padding:15px; border-radius:6px; margin-bottom:20px;">
        <p style="margin:0; font-size:0.9em; color:#666;">
          <strong>폴더 경로:</strong><br>
          <code style="background:#fff; padding:8px; display:block; margin-top:5px; border:1px solid #ddd; border-radius:4px; font-size:0.85em; word-break:break-all;">
            ${folderPath}
          </code>
        </p>
      </div>
      
      <div style="display:flex; gap:10px; justify-content:center;">
      </div>
    `;
    
const buttonContainer = content.querySelector('div:last-child');
buttonContainer.appendChild(confirmBtn);
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 모달 외부 클릭으로 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // ESC 키로 닫기
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
}

// 클립보드 복사 함수
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('클립보드 복사 실패:', err);
    return false;
  }
}

// window 객체에 등록
window.copyToClipboard = copyToClipboard;

// 단일 선박 데이터 반영
async function fetchAndUpdateVesselData(uid) {
  const row = asData.find(x => x.uid === uid);
  if (!row) {
    alert("해당 행을 찾을 수 없습니다.");
    return;
  }
  
  const imoNumber = row.imo.trim();
  if (!imoNumber) {
    alert("IMO 번호가 없습니다. IMO 번호를 먼저 입력해주세요.");
    return;
  }
  
  if (!g_apiConfig.apiKey) {
    alert("API 키가 설정되지 않았습니다. API 설정에서 키를 설정해주세요.");
    return;
  }
  
  showApiProgressModal();
  clearApiProgressText();
  updateApiProgressText(`IMO ${imoNumber} 데이터 요청 중...`);
  
  try {
    const corsProxy = "https://api.allorigins.win/raw?url=";
    const targetUrl = `${g_apiConfig.baseUrl}?userkey=${g_apiConfig.apiKey}&imo=${imoNumber}`;
    const apiUrl = `${corsProxy}${encodeURIComponent(targetUrl)}`;
    
    updateApiProgressText(`\n요청 URL: ${targetUrl}`);
    
    const response = await fetch(apiUrl);
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      updateApiProgressText(`\nJSON 파싱 오류: ${e.message}`);
      setTimeout(() => closeApiProgressModal(), 5000);
      return;
    }
    
    if (Array.isArray(data)) {
      if (data.length === 0) {
        updateApiProgressText(`\n응답 배열이 비어 있습니다.`);
        setTimeout(() => closeApiProgressModal(), 3000);
        return;
      }
      data = data[0];
    }
    
    if (data.error) {
      updateApiProgressText(`\n오류 발생: ${data.error}`);
      setTimeout(() => closeApiProgressModal(), 3000);
      return;
    }
    
    if (!data.MASTERDATA) {
      updateApiProgressText(`\nMASTERDATA 필드가 없습니다. 전체 응답 구조: ${JSON.stringify(data)}`);
      setTimeout(() => closeApiProgressModal(), 5000);
      return;
    }
    
    const vesselData = data.MASTERDATA;
    
    row.api_name = vesselData.NAME || '';
    row.api_owner = vesselData.OWNER || '';
    row.api_manager = vesselData.MANAGER || '';
    row["수정일"] = new Date().toISOString().split('T')[0];
    
    modifiedRows.add(uid);
    
    updateApiProgressText(`\n데이터 가져오기 성공!\n\n선박명: ${row.api_name}\n선주사: ${row.api_owner}\n관리사: ${row.api_manager}`);
    
    addHistory(`IMO ${imoNumber} API 데이터 업데이트`);
    
    updateRowInTable(row);
    
    setTimeout(() => closeApiProgressModal(), 3000);
    
  } catch (error) {
    console.error("API 요청 오류:", error);
    updateApiProgressText(`\n오류 발생: ${error.message}`);
    setTimeout(() => closeApiProgressModal(), 3000);
  }
}

// 전체 선박 데이터 반영
async function refreshAllVessels() {
  if (!g_apiConfig.apiKey) {
    alert("API 키가 설정되지 않았습니다. API 설정에서 키를 설정해주세요.");
    return;
  }
  
  const vesselsWithImo = asData.filter(row => row.imo && row.imo.trim());
  
  if (vesselsWithImo.length === 0) {
    alert("IMO 번호가 있는 선박이 없습니다.");
    return;
  }
  
  if (!confirm(`${vesselsWithImo.length}개 선박의 데이터를 모두 업데이트하시겠습니까? 이 작업은 시간이 오래 걸릴 수 있습니다.`)) {
    return;
  }
  
  showApiProgressModal();
  clearApiProgressText();
  updateApiProgressText(`전체 ${vesselsWithImo.length}개 선박 데이터 업데이트 시작...`);
  
  // 크레딧 확인은 동일한 CORS 프록시 사용
  try {
    const corsProxy = "https://api.allorigins.win/raw?url=";
    const statusUrl = `${corsProxy}${encodeURIComponent(`https://api.vesselfinder.com/status?userkey=${g_apiConfig.apiKey}`)}`;
    
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    const statusText = await statusResponse.text();
    
    let statusData;
    try {
      statusData = JSON.parse(statusText);
    } catch (e) {
      console.error("Status JSON 파싱 오류:", e);
      updateApiProgressText(`\n크레딧 확인 중 파싱 오류: ${e.message}`);
    }
    
    if (statusData) {
      // 다양한 응답 형식 처리
      let credits = null;
      
      if (statusData.CREDITS !== undefined) {
        credits = parseInt(statusData.CREDITS, 10);
      } else if (Array.isArray(statusData) && statusData[0] && statusData[0].CREDITS !== undefined) {
        credits = parseInt(statusData[0].CREDITS, 10);
      } else if (statusData.STATUS && statusData.STATUS.CREDITS) {
        credits = parseInt(statusData.STATUS.CREDITS, 10);
      }
      
      if (credits !== null) {
        const neededCredits = vesselsWithImo.length * 3;
        
        updateApiProgressText(`\n사용 가능 크레딧: ${credits}`);
        updateApiProgressText(`\n필요 크레딧: ${neededCredits} (${vesselsWithImo.length}개 선박 × 3)`);
        
        if (credits < neededCredits) {
          updateApiProgressText(`\n⚠️ 경고: 크레딧이 부족합니다. 일부 선박만 업데이트될 수 있습니다.`);
          
          if (!confirm("크레딧이 부족합니다. 계속 진행하시겠습니까?")) {
            closeApiProgressModal();
            return;
          }
        }
      }
    }
  } catch (error) {
    console.error("API 상태 확인 오류:", error);
    updateApiProgressText(`\n크레딧 확인 중 오류: ${error.message}`);
    
    if (!confirm("크레딧 확인 중 오류가 발생했습니다. 계속 진행하시겠습니까?")) {
      closeApiProgressModal();
      return;
    }
  }
  
  let successCount = 0;
  let errorCount = 0;
  let retryCount = 0;
  const maxRetries = 3;
  
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  // 배치 처리를 위한 설정
  const batchSize = 5; // 동시에 처리할 요청 수
  const batchDelay = 2000; // 배치 간 대기 시간 (2초)
  
  // 배치 단위로 처리
  for (let batchStart = 0; batchStart < vesselsWithImo.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, vesselsWithImo.length);
    const batch = vesselsWithImo.slice(batchStart, batchEnd);
    
    updateApiProgressText(`\n\n배치 ${Math.floor(batchStart/batchSize) + 1}/${Math.ceil(vesselsWithImo.length/batchSize)} 처리 중...`);
    
    // 배치 내의 요청들을 순차적으로 처리
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const imoNumber = row.imo.trim();
      const globalIndex = batchStart + i + 1;
      
      updateApiProgressText(`\n[${globalIndex}/${vesselsWithImo.length}] IMO ${imoNumber} 처리 중...`);
      
      let attemptCount = 0;
      let success = false;
      
      // 재시도 로직
      while (attemptCount < maxRetries && !success) {
        try {
          attemptCount++;
          
          const corsProxy = "https://api.allorigins.win/raw?url=";
          const targetUrl = `${g_apiConfig.baseUrl}?userkey=${g_apiConfig.apiKey}&imo=${imoNumber}`;
          const apiUrl = `${corsProxy}${encodeURIComponent(targetUrl)}`;
          
          // 타임아웃 설정
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
          
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const responseText = await response.text();
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (e) {
            updateApiProgressText(`\n  JSON 파싱 오류 (시도 ${attemptCount}/${maxRetries}): ${e.message}`);
            if (attemptCount < maxRetries) {
              await delay(1000); // 재시도 전 1초 대기
              continue;
            }
            errorCount++;
            break;
          }
          
          if (Array.isArray(data)) {
            if (data.length === 0) {
              updateApiProgressText(`\n  응답 배열이 비어 있습니다.`);
              errorCount++;
              break;
            }
            data = data[0];
          }
          
          if (data.error) {
            updateApiProgressText(`\n  API 오류: ${data.error}`);
            errorCount++;
            break;
          }
          
          if (!data.MASTERDATA) {
            updateApiProgressText(`\n  MASTERDATA 필드가 없습니다.`);
            errorCount++;
            break;
          }
          
          const vesselData = data.MASTERDATA;
          
          const api_name = vesselData.NAME || '';
          const api_owner = vesselData.OWNER || '';
          const api_manager = vesselData.MANAGER || '';
          
          row.api_name = api_name;
          row.api_owner = api_owner;
          row.api_manager = api_manager;
          row["수정일"] = new Date().toISOString().split('T')[0];
          
          modifiedRows.add(row.uid);
          
          updateApiProgressText(`\n  ✓ 성공: ${api_name} (${api_owner})`);
          successCount++;
          success = true;
          
        } catch (error) {
          if (error.name === 'AbortError') {
            updateApiProgressText(`\n  타임아웃 (시도 ${attemptCount}/${maxRetries})`);
          } else {
            updateApiProgressText(`\n  오류 (시도 ${attemptCount}/${maxRetries}): ${error.message}`);
          }
          
          if (attemptCount < maxRetries) {
            retryCount++;
            await delay(2000); // 재시도 전 2초 대기
          } else {
            console.error(`IMO ${imoNumber} 최종 실패:`, error);
            errorCount++;
          }
        }
      }
      
      // 개별 요청 간 대기
      await delay(500);
    }
    
    // 배치 간 대기 (마지막 배치 제외)
    if (batchEnd < vesselsWithImo.length) {
      updateApiProgressText(`\n\n다음 배치 처리 전 ${batchDelay/1000}초 대기 중...`);
      await delay(batchDelay);
    }
  }
  
  try {
    updateApiProgressText(`\n\n=== 업데이트 완료 ===`);
    updateApiProgressText(`\n성공: ${successCount}건`);
    updateApiProgressText(`\n실패: ${errorCount}건`);
    updateApiProgressText(`\n재시도: ${retryCount}회`);
    
    addHistory(`전체 선박 API 데이터 업데이트 (성공 ${successCount}건, 실패 ${errorCount}건, 재시도 ${retryCount}회)`);
    
    // 현재 필터 상태에 따라 테이블 업데이트
    if (filteredData.length > 0) {
      updateTable();
    }
    
    setTimeout(() => closeApiProgressModal(), 5000);
    
    // 완료 알림
    if (errorCount === 0) {
      alert(`모든 선박 데이터가 성공적으로 업데이트되었습니다.\n총 ${successCount}개 항목`);
    } else {
      alert(`업데이트 완료\n성공: ${successCount}개\n실패: ${errorCount}개\n\n일부 항목은 업데이트에 실패했습니다.`);
    }
    
  } catch (error) {
    console.error("업데이트 처리 오류:", error);
    updateApiProgressText(`\n\n업데이트 처리 중 오류 발생: ${error.message}`);
  }
}

// 단일 행만 업데이트
function updateRowInTable(rowData) {
  if (!rowData || !rowData.uid) return;
  
  const rowElement = document.querySelector(`.rowSelectChk[data-uid="${rowData.uid}"]`);
  if (!rowElement) return;
  
  const tr = rowElement.closest('tr');
  if (!tr) return;
  
  const apiNameCell = tr.querySelector(`td[data-field="api_name"] input`);
  const apiOwnerCell = tr.querySelector(`td[data-field="api_owner"] input`);
  const apiManagerCell = tr.querySelector(`td[data-field="api_manager"] input`);
  const modifiedDateCell = tr.querySelector(`td[data-field="수정일"]`);
  
  if (apiNameCell) apiNameCell.value = rowData.api_name || '';
  if (apiOwnerCell) apiOwnerCell.value = rowData.api_owner || '';
  if (apiManagerCell) apiManagerCell.value = rowData.api_manager || '';
  if (modifiedDateCell) modifiedDateCell.textContent = rowData["수정일"] || '';
}

/** ==================================
 *  사이드바 및 필터 기능
 * ===================================*/
// 사이드바 모드 전환
function switchSideMode(mode) {
  currentMode = mode;
  document.getElementById('btnManager').classList.remove('active');
  document.getElementById('btnOwner').classList.remove('active');

  clearAllFilters();

  if (mode === 'manager') {
    document.getElementById('btnManager').classList.add('active');
    const managerLabel = translations[currentLanguage]['현 담당'] || '현 담당';
    document.getElementById('listTitle').textContent = `${managerLabel} 목록`;
    document.getElementById('sidebar').classList.remove('expanded');
  } else {
    document.getElementById('btnOwner').classList.add('active');
    const ownerLabel = translations[currentLanguage]['SHIPOWNER'] || 'SHIPOWNER';
    document.getElementById('listTitle').textContent = `${ownerLabel} 목록`;
    document.getElementById('sidebar').classList.add('expanded');
  }
  
  updateSidebarList();
  
  // 필터 초기화 후 빈 화면 표시
  filteredData = [];
  updateTable();
}

// 사이드바 업데이트
function updateSidebarList() {
  const listDiv = document.getElementById('itemList');
  listDiv.innerHTML = '';

  if (currentMode === 'manager') {
    const mgrMap = new Map();
    let allTotalCount = 0, allProgressCount = 0;
    
    asData.forEach(d => {
      const mgr = d.manager || '';
      if (!mgr) return;
      
      if (!mgrMap.has(mgr)) {
        mgrMap.set(mgr, {totalCount: 0, progressCount: 0});
      }
      
      mgrMap.get(mgr).totalCount++;
      allTotalCount++;
      
      if (d.접수내용 && !d.기술적종료일) {
        mgrMap.get(mgr).progressCount++;
        allProgressCount++;
      }
    });
    
    appendSidebarButton(listDiv, translations[currentLanguage]['전체'] || '전체', allTotalCount, allProgressCount, () => {
      clearAllFilters();
      loadAllData();
    });
    
    const sortedManagers = Array.from(mgrMap.entries())
      .sort(([, a], [, b]) => b.totalCount - a.totalCount);
    
    sortedManagers.forEach(([mgr, {totalCount, progressCount}]) => {
      appendSidebarButton(listDiv, mgr, totalCount, progressCount, () => {
        clearAllFilters();
        document.getElementById('filterManager').value = mgr;
        applyFilters();
      });
    });
  } else {
    const owMap = new Map();
    let allTotalCount = 0, allProgressCount = 0;
    
    asData.forEach(d => {
      const ow = d.shipowner || '';
      if (!ow) return;
      
      if (!owMap.has(ow)) {
        owMap.set(ow, {totalCount: 0, progressCount: 0});
      }
      
      owMap.get(ow).totalCount++;
      allTotalCount++;
      
      if (d.접수내용 && !d.기술적종료일) {
        owMap.get(ow).progressCount++;
        allProgressCount++;
      }
    });
    
    appendSidebarButton(listDiv, translations[currentLanguage]['전체'] || '전체', allTotalCount, allProgressCount, () => {
      clearAllFilters();
      loadAllData();
    });
    
    const sortedOwners = Array.from(owMap.entries())
      .sort(([a], [b]) => {
        const isHangulA = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(a.charAt(0));
        const isHangulB = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(b.charAt(0));
        
        if (isHangulA === isHangulB) {
          return a.localeCompare(b);
        }
        
        return isHangulA ? 1 : -1;
      });
    
    sortedOwners.forEach(([owner, {totalCount, progressCount}]) => {
      appendSidebarButton(listDiv, owner, totalCount, progressCount, () => {
        clearAllFilters();
        document.getElementById('filterOwner').value = owner;
        applyFilters();
      });
    });
  }
}

// 사이드바 버튼 생성
function appendSidebarButton(container, label, total, progress, clickHandler) {
  const btn = document.createElement('button');
  btn.style.display = 'flex';
  btn.style.justifyContent = 'space-between';
  
  const left = document.createElement('span');
  left.textContent = `${label}(${total})`;
  
  const right = document.createElement('span');
  const asProgressText = translations[currentLanguage]["AS진행"] || "AS진행";
  right.textContent = `${asProgressText}(${progress})`;
  
  btn.appendChild(left);
  btn.appendChild(right);
  btn.onclick = clickHandler;
  
  container.appendChild(btn);
}

/** ==================================
 *  히스토리 관리
 * ===================================*/
function addHistory(msg) {
  const k = db.ref(histPath).push().key;
  const t = new Date().toISOString();
  db.ref(`${histPath}/${k}`).set({time: t, msg});
}

function showHistoryModal() {
  db.ref(histPath).once('value').then(snap => {
    const val = snap.val() || {};
    const arr = [];
    Object.entries(val).forEach(([, item]) => arr.push(item));
    
    arr.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    const hl = document.getElementById('historyList');
    hl.innerHTML = '';
    
    if (arr.length === 0) {
      const li = document.createElement('li');
      li.textContent = '히스토리가 없습니다.';
      hl.appendChild(li);
    } else {
      const fragment = document.createDocumentFragment();
      arr.forEach(it => {
        const li = document.createElement('li');
        li.textContent = `[${it.time}] ${it.msg}`;
        fragment.appendChild(li);
      });
      hl.appendChild(fragment);
    }
    
    document.getElementById('historyModal').style.display = 'block';
  });
}

function closeHistoryModal() {
  document.getElementById('historyModal').style.display = 'none';
}

function clearHistory() {
  if (!confirm("히스토리 전체 삭제?")) return;
  
  db.ref(histPath).remove().then(() => {
    document.getElementById('historyList').innerHTML = '<li>히스토리가 없습니다.</li>';
    alert("히스토리 삭제 완료");
  });
}

/** ==================================
 *  테이블 UI 관련 기능
 * ===================================*/
function addTableScrollStyles() {
  const styleElem = document.createElement('style');
  styleElem.textContent = `


    .table-container {
      overflow-x: auto !important;
      white-space: nowrap !important;
    }
    #asTable {
      display:inline-table !important;
      width:auto !important;
      min-width:0 !important;
      table-layout:auto !important;
    }
  `;
  document.head.appendChild(styleElem);
}

function openContentModal(text) {
  const htmlText = convertMarkdownToHTML(text);
  document.getElementById('contentText').innerHTML = htmlText;
  const modal = document.getElementById('contentModal');
  modal.style.display = 'block';
  
  const historyDataModal = document.getElementById('historyDataModal');
  if (historyDataModal && historyDataModal.style.display === 'block') {
    modal.style.zIndex = '10020';
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.zIndex = '10021';
    }
  } else {
    modal.style.zIndex = '10001';
  }
}

function closeContentModal() {
  const modal = document.getElementById('contentModal');
  modal.style.display = 'none';
  
  modal.style.zIndex = '';
  modal.style.position = '';
  modal.style.background = '';
  
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.zIndex = '';
    modalContent.style.boxShadow = '';
    modalContent.style.border = '';
  }
}

function toggleContentModalFullscreen() {
  const modal = document.getElementById('contentModal');
  modal.classList.toggle('fullscreen');
}

function toggleOwnerAIModalFullscreen() {
  const modal = document.getElementById('ownerAIModal');
  modal.classList.toggle('fullscreen');
}

function convertMarkdownToHTML(markdownText) {
  return marked.parse(markdownText || '');
}

document.addEventListener('dblclick', (e) => {
  const colRes = e.target.closest('.col-resizer');
  if (colRes) {
    const th = colRes.parentElement;
    if (th) autoFitColumn(th);
  } else {
    const th = e.target.closest('th');
    if (th) autoFitColumn(th);
  }
});

function autoFitColumn(th) {
  const table = document.getElementById('asTable');
  if (!table) return;
  
  const colIndex = Array.from(th.parentElement.children).indexOf(th);
  let maxWidth = 0;
  const rows = table.rows;
  
  const span = document.createElement('span');
  span.style.position = 'absolute';
  span.style.visibility = 'hidden';
  span.style.whiteSpace = 'nowrap';
  span.style.font = '14px sans-serif';
  document.body.appendChild(span);
  
  for (let i = 0; i < rows.length; i++) {
    const cell = rows[i].cells[colIndex];
    if (!cell) continue;
    
    let textContent = '';
    const widget = cell.querySelector('input, select, span');
    
    if (widget) {
      if (widget.tagName === 'SELECT') {
        textContent = widget.options[widget.selectedIndex]?.text || '';
      } else if (widget.tagName === 'INPUT') {
        textContent = widget.value || '';
      } else if (widget.tagName === 'SPAN') {
        textContent = widget.textContent || '';
      }
    } else {
      textContent = cell.innerText || cell.textContent || '';
    }
    
    span.textContent = textContent;
    const w = span.offsetWidth + 16;
    if (w > maxWidth) maxWidth = w;
  }
  
  document.body.removeChild(span);
  
  maxWidth = Math.max(maxWidth, 50);
  th.style.width = maxWidth + 'px';
}

/** ==================================
 *  열/행 크기 조절 관련 기능
 * ===================================*/
let resizingCol = null, startX = 0, startW = 0;
let resizingRow = null, startY = 0, startH = 0;

function handleMouseDown(e) {
  if (e.target.classList.contains('col-resizer')) {
    startColumnResize(e);
  }
}

function startColumnResize(e) {
  resizingCol = e.target.parentElement;
  startX = e.pageX;
  startW = resizingCol.offsetWidth;
  
  document.addEventListener('mousemove', handleColumnResize);
  document.addEventListener('mouseup', stopColumnResize);
  e.preventDefault();
}

function handleColumnResize(e) {
  if (!resizingCol) return;
  
  const dx = e.pageX - startX;
  const newWidth = startW + dx;
  
  if (newWidth >= 30) {
    resizingCol.style.width = newWidth + 'px';
  }
}

function stopColumnResize() {
  document.removeEventListener('mousemove', handleColumnResize);
  document.removeEventListener('mouseup', stopColumnResize);
  resizingCol = null;
}

function startRowResize(e, tr) {
  resizingRow = tr;
  startY = e.pageY;
  startH = tr.offsetHeight;
  
  document.addEventListener('mousemove', handleRowResize);
  document.addEventListener('mouseup', stopRowResize);
  e.preventDefault();
}

function handleRowResize(e) {
  if (!resizingRow) return;
  
  const dy = e.pageY - startY;
  const newHeight = startH + dy;
  
  if (newHeight > 20) {
    resizingRow.style.height = newHeight + 'px';
  }
}

function stopRowResize() {
  document.removeEventListener('mousemove', handleRowResize);
  document.removeEventListener('mouseup', stopRowResize);
  resizingRow = null;
}

/** ==================================
 *  엑셀 다운로드/업로드
 * ===================================*/
function downloadExcel() {
  const btn = document.getElementById('downloadExcelBtn');
  const originalText = btn.textContent;
  btn.textContent = "다운로드 중...";
  btn.disabled = true;

  setTimeout(() => {
    try {
      const arr = asData.map(d => {
        const counts = d.historyCounts || { perYear: {}, total: 0 };
        const row = {
          공번: d.공번, 공사: d.공사, IMO: d.imo, HULL: d.hull, SHIPNAME: d.shipName,
          SHIPOWNER: d.shipowner, 'API_NAME': d.api_name, 'API_OWNER': d.api_owner, 'API_MANAGER': d.api_manager,
          '호선 대표메일': d.repMail, 'SHIP TYPE': d.shipType, SCALE: d.scale, 구분: d.구분,
          주요선사: d.major, 그룹: d.group, SHIPYARD: d.shipyard,
          계약: d.contract, 'AS 구분': d.asType, 인도일: d.delivery, 보증종료일: d.warranty,
          '전 담당': d.prevManager, '현 담당': d.manager, 현황: d.현황, 현황번역: d.현황번역, 동작여부: d.동작여부,
          조치계획: d.조치계획, 접수내용: d.접수내용, 조치결과: d.조치결과,
          'AS접수건수': counts.total
        };
        historyYears.forEach(y => {
          row[String(y)] = counts.perYear[y] || 0;
        });
        row['AS접수일자'] = d['AS접수일자'];
        row['기술적종료일'] = d['기술적종료일'];
        row['정상지연'] = d['정상지연'];
        row['지연 사유'] = d['지연 사유'];
        row['수정일'] = d['수정일'];
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(arr);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "AS_Data");
      
      XLSX.writeFile(wb, "AS_Data.xlsx");
    } catch (err) {
      console.error("엑셀 다운로드 오류:", err);
      alert("엑셀 다운로드 중 오류가 발생했습니다.");
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }, 100);
}

function proceedExcelUpload(mode) {
  document.getElementById('uploadExcelInput').click();
  document.getElementById('uploadExcelInput').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    readExcelFile(file, mode);
    e.target.value = '';
  };
}

function readExcelFile(file, mode) {
  const reader = new FileReader();
  
  reader.onload = function(evt) {
    let loadingEl = document.createElement('div');
    loadingEl.style.position = 'fixed';
    loadingEl.style.top = '50%';
    loadingEl.style.left = '50%';
    loadingEl.style.transform = 'translate(-50%, -50%)';
    loadingEl.style.background = 'rgba(0,0,0,0.7)';
    loadingEl.style.color = 'white';
    loadingEl.style.padding = '20px';
    loadingEl.style.borderRadius = '5px';
    loadingEl.style.zIndex = '9999';
    loadingEl.textContent = '엑셀 데이터 처리 중...';
    document.body.appendChild(loadingEl);
    
    setTimeout(() => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, {type: 'array', cellDates: true, dateNF: "yyyy-mm-dd"});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {defval: ""});
        
        // 수정 전: 기존 데이터의 API 정보를 보존하기 위한 맵 생성
        const existingApiData = {};
        asData.forEach(row => {
          if (row.imo) {
            existingApiData[row.imo] = {
              api_name: row.api_name || '',
              api_owner: row.api_owner || '',
              api_manager: row.api_manager || ''
            };
          }
        });
        
        let newData = json.map(r => {
          const uid = db.ref().push().key;
          const now = new Date().toISOString().split('T')[0];
          const imoValue = parseCell(r['IMO']);
          
          // 수정 후: 기존 API 데이터가 있으면 보존, 없으면 엑셀 데이터 사용
          let apiData = {
            api_name: '',
            api_owner: '',
            api_manager: ''
          };
          
          if (imoValue && existingApiData[imoValue]) {
            // 기존 API 데이터 사용
            apiData = existingApiData[imoValue];
          } else if (r['API_NAME'] || r['API_OWNER'] || r['API_MANAGER']) {
            // 엑셀에 API 데이터가 있으면 사용
            apiData = {
              api_name: parseCell(r['API_NAME']),
              api_owner: parseCell(r['API_OWNER']),
              api_manager: parseCell(r['API_MANAGER'])
            };
          }
          
          return {
            uid,
            공번: parseCell(r['공번']),
            공사: parseCell(r['공사']),
            imo: imoValue,
            hull: parseCell(r['HULL']),
            shipName: parseCell(r['SHIPNAME']),
            api_name: apiData.api_name,        // 보존된 API 데이터 사용
            api_owner: apiData.api_owner,      // 보존된 API 데이터 사용
            api_manager: apiData.api_manager,  // 보존된 API 데이터 사용
            repMail: parseCell(r['호선 대표메일']),
            shipType: parseCell(r['SHIP TYPE']),
            scale: parseCell(r['SCALE']),
            구분: parseCell(r['구분']),
            shipowner: parseCell(r['SHIPOWNER']),
            major: parseCell(r['주요선사']),
            group: String(parseCell(r['그룹']) || ''),
            shipyard: parseCell(r['SHIPYARD']),
            contract: parseCell(r['계약']),
            asType: parseCell(r['AS 구분']) || '유상',
            delivery: parseDate(r['인도일'] || ''),
            warranty: parseDate(r['보증종료일'] || ''),
            prevManager: parseCell(r['전 담당']),
            manager: parseCell(r['현 담당']),
            현황: parseCell(r['현황']),
            현황번역: parseCell(r['현황번역']),
            동작여부: normalizeOperationStatus(parseCell(r['동작여부']) || '정상'),
            조치계획: parseCell(r['조치계획']),
            접수내용: parseCell(r['접수내용']),
            조치결과: parseCell(r['조치결과']),
            "AS접수일자": parseDate(r['AS접수일자'] || ''),
            "기술적종료일": parseDate(r['기술적종료일'] || ''),
            "정상지연": (r['정상지연'] === 'Y') ? 'Y' : '',
            "지연 사유": parseCell(r['지연 사유']),
            "수정일": parseDate(r['수정일'] || '') || now
          };
        });
        
        if (mode === 'replace') {
          db.ref(asPath).remove().then(() => {
            const updates = {};
            newData.forEach(obj => {
              updates[obj.uid] = obj;
            });
            
            db.ref(asPath).update(updates)
              .then(() => {
                asData = newData;
                clearAllFilters();
                loadAllData();
                document.body.removeChild(loadingEl);
                alert(`엑셀 업로드(교체) 완료 (총 ${json.length}건)\nAPI 정보는 기존 데이터가 보존되었습니다.`);
              })
              .catch(err => {
                console.error("엑셀 업로드 오류:", err);
                document.body.removeChild(loadingEl);
                alert("데이터 저장 중 오류가 발생했습니다.");
              });
          });
        } else {
          // 추가 모드에서도 기존 데이터의 API 정보 확인
          const updates = {};
          newData.forEach(obj => {
            // 추가하려는 데이터의 IMO가 이미 존재하는 경우 API 정보 보존
            const existingRow = asData.find(row => row.imo === obj.imo);
            if (existingRow && existingRow.api_name) {
              obj.api_name = existingRow.api_name;
              obj.api_owner = existingRow.api_owner;
              obj.api_manager = existingRow.api_manager;
            }
            updates[obj.uid] = obj;
          });
          
          db.ref(asPath).update(updates)
            .then(() => {
              asData = asData.concat(newData);
              clearAllFilters();
              loadAllData();
              document.body.removeChild(loadingEl);
              alert(`엑셀 업로드(추가) 완료 (총 ${json.length}건)\nAPI 정보는 기존 데이터가 보존되었습니다.`);
            })
            .catch(err => {
              console.error("엑셀 업로드 오류:", err);
              document.body.removeChild(loadingEl);
              alert("데이터 저장 중 오류가 발생했습니다.");
            });
        }
      } catch (err) {
        console.error("엑셀 파일 처리 오류:", err);
        document.body.removeChild(loadingEl);
        alert("엑셀 파일 처리 중 오류가 발생했습니다.");
      }
    }, 100);
  };
  
  reader.readAsArrayBuffer(file);
}

function normalizeOperationStatus(status) {
  switch (status) {
    case '정상A':
    case '정상B':
    case '유상정상':
      return '정상';
    case '부분동작':
      return '부분동작';
    case '동작불가':
      return '동작불가';
    default:
      return '정상';
  }
}

function parseCell(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number') return String(v);
  if (v === '#N/A') return '';
  return String(v);
}

function parseDate(v) {
  if (!v) return '';
  
  if (typeof v === 'object' && v instanceof Date) {
    return toYMD(v);
  }
  
  if (typeof v === 'string') {
    let s = v.trim().replace(/\//g, '-').replace(/\./g, '-');
    if (s === '#N/A' || s === '0' || s === '') return '';
    
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts.length === 3) {
        let yy = parts[0].padStart(4, '0');
        let mm = parts[1].padStart(2, '0');
        let dd = parts[2].padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
      }
    }
    return s;
  }
  
  return '';
}

function toYMD(dt) {
  const y = dt.getFullYear();
  const m = ('0' + (dt.getMonth() + 1)).slice(-2);
  const d = ('0' + dt.getDate()).slice(-2);
  return `${y}-${m}-${d}`;
}

/** ==================================
 *  AS 현황 업로드
 * ===================================*/
function handleAsStatusUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  readAsStatusFile(file);
  e.target.value = '';
}

function readAsStatusFile(file) {
  const reader = new FileReader();
  
  reader.onload = function(evt) {
    let loadingEl = document.createElement('div');
    loadingEl.style.position = 'fixed';
    loadingEl.style.top = '50%';
    loadingEl.style.left = '50%';
    loadingEl.style.transform = 'translate(-50%, -50%)';
    loadingEl.style.background = 'rgba(0,0,0,0.7)';
    loadingEl.style.color = 'white';
    loadingEl.style.padding = '20px';
    loadingEl.style.borderRadius = '5px';
    loadingEl.style.zIndex = '9999';
    loadingEl.textContent = 'AS 현황 데이터 처리 중...';
    document.body.appendChild(loadingEl);
    
    setTimeout(() => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, {type: 'array', cellDates: true, dateNF: "yyyy-mm-dd"});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {defval: ""});
        
        const map = {};
        const projectCount = {};
        const batchAiRecords = {};
        const now = new Date().toISOString().split('T')[0];
        
        json.forEach(row => {
          const asStatus = (row['AS진행상태'] || '').trim();
          if (asStatus === '접수취소') return;
          
          const project = (row['수익프로젝트'] || '').trim();
          if (!project) return;
          
          const asDateRaw = row['AS접수일자'] || '';
          let asDateFormatted = '';
          if (asDateRaw) {
            const asDateObj = new Date(asDateRaw.replace(/[./]/g, '-') + "T00:00");
            if (!isNaN(asDateObj.getTime())) {
              asDateFormatted = dateToYMD(asDateObj.getTime());
            }
          }
          
          const tEndRaw = row['기술적종료일자'] || '';
          let tEndFormatted = '';
          if (tEndRaw) {
            tEndFormatted = parseDateString(tEndRaw);
          }
          
          const aiRecordKey = getProjectHistoryRef(project).push().key;
          batchAiRecords[`${aiHistoryPath}/${project}/${aiRecordKey}`] = {
            project: project,
            AS접수일자: asDateFormatted,
            조치계획: (row['조치계획'] || '').trim(),
            접수내용: (row['접수내용'] || '').trim(),
            조치결과: (row['조치결과'] || '').trim(),
            기술적종료일: tEndFormatted,
            timestamp: new Date().toISOString()
          };
          
          if (!projectCount[project]) {
            projectCount[project] = 1;
          } else {
            projectCount[project]++;
          }
          
          const asDateMS = asDateRaw ? new Date(asDateRaw.replace(/[./]/g, '-') + "T00:00").getTime() : 0;
          
          if (isNaN(asDateMS)) return;
          
          const plan = row['조치계획'] || '';
          const rec = row['접수내용'] || '';
          const res = row['조치결과'] || '';
          const tEnd = tEndRaw || '';
          
          if (!map[project]) {
            map[project] = {asDate: asDateMS, plan, rec, res, tEnd};
          } else if (asDateMS > map[project].asDate) {
            map[project] = {asDate: asDateMS, plan, rec, res, tEnd};
          }
        });
        
        for (const recordPath in batchAiRecords) {
          const project = batchAiRecords[recordPath].project;
          if (projectCount[project]) {
            batchAiRecords[recordPath].접수건수 = projectCount[project];
          }
        }
        
        const updates = {};
        
        Object.assign(updates, batchAiRecords);
        
        let updateCount = 0;
        for (let project in map) {
          const item = map[project];
          const row = asData.find(x => x.공번 === project);
          
          if (row) {
            row.조치계획 = item.plan;
            row.접수내용 = item.rec;
            row.조치결과 = item.res;
            row["기술적종료일"] = parseDateString(item.tEnd);
            row["AS접수일자"] = dateToYMD(item.asDate);
            row["수정일"] = now;
            row["현황번역"] = "";
            
            updates[`${asPath}/${row.uid}/조치계획`] = row.조치계획;
            updates[`${asPath}/${row.uid}/접수내용`] = row.접수내용;
            updates[`${asPath}/${row.uid}/조치결과`] = row.조치결과;
            updates[`${asPath}/${row.uid}/기술적종료일`] = row["기술적종료일"];
            updates[`${asPath}/${row.uid}/AS접수일자`] = row["AS접수일자"];
            updates[`${asPath}/${row.uid}/수정일`] = row["수정일"];
            updates[`${asPath}/${row.uid}/현황번역`] = "";
            
            updateCount++;
          }
        }
        
        db.ref().update(updates)
          .then(() => {
            addHistory(`AS 현황 업로드 - 총 ${updateCount}건 접수/조치정보 갱신`);
            
            // 현재 필터 상태에 따라 테이블 업데이트
            if (filteredData.length > 0) {
              updateTable();
            }
            
            document.body.removeChild(loadingEl);
            alert(`AS 현황 업로드 완료 (총 ${updateCount}건 업데이트)`);
          })
          .catch(err => {
            console.error("AS 현황 업로드 오류:", err);
            document.body.removeChild(loadingEl);
            alert("데이터 저장 중 오류가 발생했습니다.");
          });
      } catch (err) {
        console.error("AS 현황 파일 처리 오류:", err);
        document.body.removeChild(loadingEl);
        alert("AS 현황 파일 처리 중 오류가 발생했습니다.");
      }
    }, 100);
  };
  
  reader.readAsArrayBuffer(file);
}

function parseDateString(str) {
  if (!str) return '';
  let v = str.trim().replace(/[./]/g, '-');
  let d = new Date(v + "T00:00");
  if (!isNaN(d.getTime())) {
    const yy = d.getFullYear();
    const mm = ('0' + (d.getMonth() + 1)).slice(-2);
    const dd = ('0' + d.getDate()).slice(-2);
    return `${yy}-${mm}-${dd}`;
  }
  return '';
}

function dateToYMD(ms) {
  if (!ms) return '';
  let d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  let yy = d.getFullYear();
  let mm = ('0' + (d.getMonth() + 1)).slice(-2);
  let dd = ('0' + d.getDate()).slice(-2);
  return `${yy}-${mm}-${dd}`;
}

/** ==================================
 *  AI 요약 기능
 * ===================================*/
async function summarizeAndUpdateRow(uid) {
  const row = asData.find(r => r.uid === uid);
  if (!row) {
    alert("대상 행 없음");
    return;
  }
  
  const basePrompt = g_aiConfig.promptRow || "접수내용과 조치결과를 간단히 요약해주세요.";
  const textOriginal = 
    `접수내용:\n${row.접수내용 || "없음"}\n\n` +
    `조치결과:\n${row.조치결과 || "없음"}\n`;

  const finalPrompt = basePrompt + "\n\n" + textOriginal;

  showAiProgressModal();
  clearAiProgressText();
  document.getElementById('aiProgressText').textContent = "[단일 행 요약 진행 중]\n\n";

  try {
    const summary = await callAiForSummary(finalPrompt);
    
    if (!summary) {
      alert("AI 요약 실패 (빈 값 반환)");
      return;
    }
    
    row.현황 = summary;
    row.현황번역 = "";
    row["수정일"] = new Date().toISOString().split('T')[0];
    
    modifiedRows.add(uid);
    
    updateSingleRowInTable(uid, { 현황: summary, 현황번역: "", "수정일": row["수정일"] });
    
    addHistory(`AI 요약 완료 - [${uid}] 현황 업데이트`);
    alert("AI 요약 결과가 '현황' 필드에 반영되었습니다.");
  } catch (err) {
    console.error("AI 요약 오류:", err);
    alert("AI 요약 처리 중 오류가 발생했습니다.");
  } finally {
    closeAiProgressModal();
  }
}

function updateSingleRowInTable(uid, updates) {
  const checkbox = document.querySelector(`.rowSelectChk[data-uid="${uid}"]`);
  if (!checkbox) return;
  
  const tr = checkbox.closest('tr');
  if (!tr) return;
  
  Object.entries(updates).forEach(([field, value]) => {
    if (field === "수정일") {
      const cell = tr.querySelector(`td[data-field="${field}"]`);
      if (cell) {
        cell.textContent = value || '';
      }
    } else {
      const cell = tr.querySelector(`td[data-field="${field}"] input`);
      if (cell) {
        cell.value = value || '';
      }
    }
  });
}

async function summarizeHistoryForProject(project) {
  if (!project) {
    alert("공번(수익프로젝트) 정보가 없습니다.");
    return;
  }
  
  try {
    const currentRow = asData.find(x => x.공번 === project);
    if (!currentRow) {
      alert("해당 공번의 데이터를 찾을 수 없습니다.");
      return;
    }
    
    const snapshot = await getProjectHistoryRef(project).once('value');
    const historyData = snapshot.val() || {};
    
    const uniqueRecords = new Map();
    
    if (currentRow["AS접수일자"] && (currentRow.접수내용 || currentRow.조치결과)) {
      const key = `${currentRow["AS접수일자"]}_${currentRow.접수내용 || ''}_${currentRow.조치결과 || ''}`;
      uniqueRecords.set(key, {
        asDate: currentRow["AS접수일자"],
        plan: currentRow.조치계획 || '',
        rec: currentRow.접수내용 || '',
        res: currentRow.조치결과 || '',
        tEnd: currentRow["기술적종료일"] || ''
      });
    }
    
    Object.values(historyData).forEach(rec => {
      if (!rec.AS접수일자) return;
      
      const key = `${rec.AS접수일자}_${rec.접수내용 || ''}_${rec.조치결과 || ''}`;
      if (!uniqueRecords.has(key)) {
        uniqueRecords.set(key, {
          asDate: rec.AS접수일자,
          plan: rec.조치계획 || '',
          rec: rec.접수내용 || '',
          res: rec.조치결과 || '',
          tEnd: rec.기술적종료일 || ''
        });
      }
    });
    
    let allRecords = Array.from(uniqueRecords.values());
    
    if (allRecords.length === 0) {
      alert("해당 공번에 AS 기록이 없습니다.");
      return;
    }
    
    allRecords.sort((a, b) => {
      const dateA = new Date(a.asDate || '1900-01-01');
      const dateB = new Date(b.asDate || '1900-01-01');
      return dateB - dateA;
    });
    
    console.log('히스토리 AI 요약 - 수집된 기록 (중복 제거):', allRecords);
    console.log('총 레코드 수:', allRecords.length);
    
    let combinedText = `공번: ${project}\n`;
    combinedText += `선박명: ${currentRow.shipName || 'N/A'}\n`;
    combinedText += `선주사: ${currentRow.shipowner || 'N/A'}\n`;
    combinedText += `총 ${allRecords.length}건의 AS 기록\n\n`;
    
    allRecords.forEach((rec, idx) => {
      combinedText += `AS접수일자: ${rec.asDate || 'N/A'}\n`;
      combinedText += `[조치계획]\n${rec.plan || '내용 없음'}\n\n`;
      combinedText += `[접수내용]\n${rec.rec || '내용 없음'}\n\n`;
      combinedText += `[조치결과]\n${rec.res || '내용 없음'}\n\n`;
      if (rec.tEnd) {
        combinedText += `기술적종료일: ${rec.tEnd}\n`;
      }
      combinedText += `----\n\n`;
    });

    const basePrompt = g_aiConfig.promptHistory || 
      "해당 공번의 AS접수일자/조치계획/접수내용/조치결과가 시간순으로 주어집니다. 이를 종합하여 요약해 주세요.";
    const promptText = basePrompt + "\n\n" + combinedText;

    showAiProgressModal();
    clearAiProgressText();
    document.getElementById('aiProgressText').textContent = "[히스토리 요약 진행 중]\n\n";

    const summary = await callAiForSummary(promptText);
    
    if (!summary) {
      alert("AI 요약 실패 (빈 값 반환)");
      return;
    }
    
    openHistorySummaryModal(summary, project, currentRow, true);
    
  } catch (err) {
    console.error("히스토리 AI 요약 오류:", err);
    alert("히스토리 AI 요약 처리 중 오류가 발생했습니다.");
  } finally {
    closeAiProgressModal();
  }
}

function openHistorySummaryModal(summary, project, rowData, fullscreen = false) {
  const existingModal = document.getElementById('historySummaryModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'historyDataModal';
  modal.style.cssText = 'display: block; position: fixed; z-index: 10015; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5);';

  if (fullscreen) {
    modal.classList.add('fullscreen');
    modal.style.background = 'rgba(0, 0, 0, 0.7)';
    modal.style.zIndex = '10015';
  }
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  if (fullscreen) {
    modalContent.style.cssText = 'background: #fff; width: 100% !important; height: 100% !important; max-width: 100%; max-height: 100%; margin: 0 !important; border-radius: 0; padding: 20px; position: relative; overflow-y: auto;';
  } else {
    modalContent.style.cssText = 'background: #fff; margin: 5% auto; width: 1000px; border-radius: 6px; padding: 20px; position: relative; max-height: 85%; overflow-y: auto;';
  }
  
  const closeBtn = document.createElement('span');
  closeBtn.className = 'close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => modal.remove();
  modalContent.appendChild(closeBtn);
  
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.style.cssText = 'position:absolute; right:45px; top:10px; font-size:0.85em; background:#666; color:#fff; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;';
  fullscreenBtn.textContent = '전체화면';
  fullscreenBtn.onclick = () => toggleHistorySummaryFullscreen();
  modalContent.appendChild(fullscreenBtn);
  
  const title = document.createElement('h2');
  title.textContent = `히스토리 AI 요약 - ${project}`;
  modalContent.appendChild(title);
  
  const subtitle = document.createElement('p');
  subtitle.style.cssText = 'font-size:0.85em; color:#666; margin-bottom:20px;';
  subtitle.textContent = `${rowData.shipName || 'N/A'} (${rowData.shipowner || 'N/A'})`;
  modalContent.appendChild(subtitle);
  
  const summaryDiv = document.createElement('div');
  summaryDiv.id = 'historySummaryText';
  summaryDiv.innerHTML = convertMarkdownToHTML(summary);
  summaryDiv.style.cssText = 'margin: 20px 0; line-height: 1.8; font-size: 0.95em; z-index: 10006; position: relative;';
  modalContent.appendChild(summaryDiv);
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

function toggleHistorySummaryFullscreen() {
  const modal = document.getElementById('historySummaryModal');
  modal.classList.toggle('fullscreen');
}

async function openOwnerAIModal() {
  const filterVal = document.getElementById('filterOwner').value.trim();
  if (!filterVal) {
    alert("SHIPOWNER 필터 먼저 입력/선택");
    return;
  }
  
  const targetRows = asData.filter(r => (r.shipowner || '').toLowerCase().includes(filterVal.toLowerCase()));
  
  if (!targetRows.length) {
    alert("해당 선사로 필터된 항목 없음");
    return;
  }
  
  targetRows.sort((a, b) => a.uid > b.uid ? 1 : -1);

  let combinedText = `선사명: ${filterVal}\n\n총 ${targetRows.length}건\n\n`;
  
  const batchSize = 20;
  const batches = [];
  
  for (let i = 0; i < targetRows.length; i += batchSize) {
    const batch = targetRows.slice(i, i + batchSize);
    let batchText = '';
    
    batch.forEach(r => {
      batchText += 
        `SHIPNAME: ${r.shipName || 'N/A'}\nAS접수일자: ${r["AS접수일자"] || 'N/A'}\n` +
        `[접수내용]\n${r.접수내용 || '내용 없음'}\n\n[조치결과]\n${r.조치결과 || '내용 없음'}\n\n----\n`;
    });
    
    batches.push(batchText);
  }
  
  const basePrompt = g_aiConfig.promptOwner || 
    "여러 호선의 AS접수일자/접수내용/조치결과가 주어집니다. 이를 요약해 주세요.";

  showAiProgressModal();
  clearAiProgressText();
  document.getElementById('aiProgressText').textContent = "[선사별 요약 진행 중]\n\n";
  
  try {
    let allSummaries = '';
    
    for (let i = 0; i < batches.length; i++) {
      updateAiProgressText(`\n배치 ${i+1}/${batches.length} 처리 중...\n`);
      
      const batchPrompt = basePrompt + "\n\n" + combinedText + batches[i];
      const batchSummary = await callAiForSummary(batchPrompt);
      
      if (batchSummary) {
        if (allSummaries) allSummaries += "\n\n---\n\n";
        allSummaries += batchSummary;
      }
    }
    
    let finalSummary = allSummaries;
    
    if (batches.length > 1 && allSummaries.length > 2000) {
      updateAiProgressText("\n\n최종 요약 생성 중...\n");
      const finalPrompt = `${basePrompt}\n\n다음은 ${batches.length}개 배치로 나눈 요약 결과입니다. 이를 통합하여 최종 요약해주세요:\n\n${allSummaries}`;
      finalSummary = await callAiForSummary(finalPrompt);
    }
    
    if (!finalSummary) {
      alert("AI 요약 실패 (빈 값 반환)");
      return;
    }
    
    document.getElementById('ownerAISummaryText').innerHTML = convertMarkdownToHTML(finalSummary);
    document.getElementById('ownerAIModal').style.display = 'block';
    document.getElementById('ownerAIModal').style.zIndex = '10004';
  } catch (err) {
    console.error("선사별 AI 요약 오류:", err);
    alert("선사별 AI 요약 처리 중 오류가 발생했습니다.");
  } finally {
    closeAiProgressModal();
  }
}

async function callAiForSummary(userPrompt) {
  const apiKey = g_aiConfig.apiKey;
  const modelName = g_aiConfig.model || "";

  if (!apiKey) {
    updateAiProgressText("에러: 관리자 패널에 API Key가 설정되지 않음.\n");
    return "";
  }

  try {
    if (modelName.toLowerCase().startsWith("gpt")) {
      return await callOpenAiForSummary(userPrompt, apiKey, modelName);
    } else {
      return await callGeminiForSummary(userPrompt, apiKey, modelName);
    }
  } catch (err) {
    console.error("AI API 호출 오류:", err);
    updateAiProgressText(`\n[AI 호출 중 오류 발생]\n${err.message}`);
    return "";
  }
}

async function callOpenAiForSummary(contentText, apiKey, modelName) {
  let displayModel = modelName;
  
  if (modelName === "gpt-4o-mini") {
    displayModel = "gpt-4o-mini";
  }

  try {
    updateAiProgressText(`OpenAI 모델(${displayModel}) 호출 중...\n`);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {role: "user", content: contentText}
        ],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error("OpenAI API 응답 오류:", data);
      updateAiProgressText("\n[오류]\n" + JSON.stringify(data));
      return "";
    }
    
    const result = data.choices?.[0]?.message?.content?.trim() || "";
    updateAiProgressText("\n[응답 완료]\n");
    return result;
  } catch (err) {
    console.error("OpenAI API 요청 오류:", err);
    updateAiProgressText("\n[에러 발생]\n" + err.message);
    return "";
  }
}

async function callGeminiForSummary(contentText, apiKey, modelName) {
  try {
    const model = modelName || "gemini-1.5-pro-latest";
    updateAiProgressText(`Gemini 모델(${model}) 호출 중...\n`);
    
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {text: contentText}
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (response.ok && data.candidates) {
      const txt = data.candidates[0]?.content?.parts[0]?.text?.trim() || "";
      updateAiProgressText("[Gemini 응답 완료]\n");
      return txt;
    } else {
      console.error("Gemini API 오류:", data);
      updateAiProgressText("\n[에러] " + JSON.stringify(data, null, 2));
      return "";
    }
  } catch (err) {
    console.error("Gemini API 요청 오류:", err);
    updateAiProgressText("\n[에러 발생]\n" + err.message);
    return "";
  }
}

/** ==================================
 *  담당자별 현황 관리
 * ===================================*/
function openManagerStatusModal() {
  loadManagerScheduleStatus();
  const modal = document.getElementById('managerStatusModal');
  modal.style.display = 'block';
  modal.classList.add('fullscreen');
  modal.style.background = 'rgba(0, 0, 0, 0.7)';
  const modalContent = modal.querySelector('.modal-content');
  modalContent.style.cssText = 'background: #fff; width: 100% !important; height: 100% !important; max-width: 100%; max-height: 100%; margin: 0 !important; border-radius: 0; padding: 20px; position: relative; overflow-y: auto;';
}

function closeManagerStatusModal() {
  document.getElementById('managerStatusModal').style.display = 'none';
}

async function loadManagerScheduleStatus() {
  try {
    console.log('=== 담당자별 현황 로드 시작 ===');
    
    const managers = new Set();
    asData.forEach(row => {
      if (row.manager && row.manager.trim()) {
        managers.add(row.manager.trim());
      }
    });
    console.log('전체 담당자 목록:', Array.from(managers));

    const mainUsersSnapshot = await db.ref(mainUsersPath).once('value');
    const mainUsers = mainUsersSnapshot.val() || {};
    console.log('Main users 데이터:', mainUsers);
    
    const checksSnapshot = await db.ref(scheduleCheckPath).once('value');
    const scheduleData = checksSnapshot.val() || {};
    console.log('일정 확인 데이터:', scheduleData);
    
    const metaSnapshot = await db.ref('as-service/user_meta').once('value');
    const metaData = metaSnapshot.val() || {};
    console.log('사용자 메타 데이터:', metaData);
    
    const nameToUid = {};
    const uidToName = {};
    
    for (const uid in mainUsers) {
      const user = mainUsers[uid];
      if (user.id) {
        nameToUid[user.id] = uid;
        uidToName[uid] = user.id;
        console.log(`Main users 매핑: ${user.id} -> ${uid}`);
      }
    }
    
    managerScheduleStatus = {};
    
    managers.forEach(managerName => {
      console.log(`\n담당자 ${managerName} 처리 중...`);
      
      let lastCheck = null;
      let lastAccess = null;
      let foundUid = null;
      
      if (nameToUid[managerName]) {
        foundUid = nameToUid[managerName];
        console.log(`이름 매핑으로 UID 발견: ${foundUid}`);
      }
      
      if (foundUid) {
        if (scheduleData[foundUid]) {
          lastCheck = scheduleData[foundUid].lastCheckDate;
          console.log(`일정 확인 날짜: ${lastCheck}`);
        }
        
        if (metaData[foundUid]) {
          lastAccess = metaData[foundUid].lastLogin;
          console.log(`마지막 접속: ${lastAccess}`);
        }
      }
      
      managerScheduleStatus[managerName] = {
        name: managerName,
        lastAccess: lastAccess,
        lastCheck: lastCheck,
        scheduleCount: asData.filter(row => row.manager === managerName).length,
        uid: foundUid
      };
      
      console.log(`${managerName} 최종 상태:`, managerScheduleStatus[managerName]);
    });
    
    console.log('\n=== 최종 담당자별 상태 ===');
    console.log(managerScheduleStatus);
    
    displayManagerStatus();
  } catch (error) {
    console.error('담당자별 현황 로드 오류:', error);
    alert('담당자별 현황을 불러오는 중 오류가 발생했습니다.');
  }
}

function displayManagerStatus() {
  const container = document.getElementById('managerStatusList');
  container.innerHTML = '';
  
  console.log('표시할 담당자 상태:', managerScheduleStatus);
  
  if (!managerScheduleStatus || Object.keys(managerScheduleStatus).length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">표시할 데이터가 없습니다.</p>';
    return;
  }
  
  const sortType = document.getElementById('managerStatusSort').value;
  let sortedManagers = Object.values(managerScheduleStatus);
  
  sortedManagers.sort((a, b) => {
    switch(sortType) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'overdue':
        return getDaysSinceCheck(b.lastCheck) - getDaysSinceCheck(a.lastCheck);
      case 'access':
        return (b.lastAccess || '').localeCompare(a.lastAccess || '');
      default:
        return 0;
    }
  });
  
  const table = document.createElement('table');
  table.className = 'manager-status-table';
  
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>담당자</th>
      <th>일정</th>
      <th>접속</th>
      <th>확인</th>
      <th>경과</th>
    </tr>
  `;
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  
  sortedManagers.forEach(manager => {
    const tr = document.createElement('tr');
    
    const daysSince = getDaysSinceCheck(manager.lastCheck);
    let textColor = '#000';
    if (daysSince >= 21) {
      textColor = '#dc3545';
    } else if (daysSince >= 14) {
      textColor = '#fd7e14';
    } else if (daysSince >= 7) {
      textColor = '#ffc107';
    }
    
    const formatDateWithYear = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\. /g, '-').replace('.', '');
    };

    const lastAccessDate = formatDateWithYear(manager.lastAccess);
    const lastCheckDate = formatDateWithYear(manager.lastCheck);
    
    const td1 = document.createElement('td');
    td1.textContent = manager.name;
    tr.appendChild(td1);
    
    const td2 = document.createElement('td');
    td2.style.textAlign = 'center';
    td2.textContent = manager.scheduleCount;
    tr.appendChild(td2);
    
    const td3 = document.createElement('td');
    td3.style.textAlign = 'center';
    td3.textContent = lastAccessDate;
    tr.appendChild(td3);
    
    const td4 = document.createElement('td');
    td4.style.textAlign = 'center';
    td4.textContent = lastCheckDate;
    tr.appendChild(td4);
    
    const td5 = document.createElement('td');
    td5.style.textAlign = 'center';
    td5.style.fontWeight = 'bold';
    td5.style.color = textColor;
    td5.textContent = daysSince + '일';
    tr.appendChild(td5);
    
    tr.style.cursor = 'pointer';
    tr.onclick = () => {
      if (confirm(`${manager.name} 담당자의 일정을 확인하셨습니까?`)) {
        confirmScheduleForManager(manager.name);
      }
    };
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  
  container.appendChild(table);
  
  const modal = document.querySelector('#managerStatusModal .modal-content');
  if (modal) {
    modal.style.maxWidth = '90%';
  }
  
  console.log('테이블 렌더링 완료');
}

async function confirmScheduleForManager(managerName) {
  const user = auth.currentUser;
  if (!user) {
    alert('로그인이 필요합니다.');
    return;
  }
  
  try {
    const now = new Date().toISOString();
    
    let targetUid = null;
    
    if (managerScheduleStatus[managerName] && managerScheduleStatus[managerName].uid) {
      targetUid = managerScheduleStatus[managerName].uid;
    }
    
    if (!targetUid) {
      const mainUsersSnapshot = await db.ref(mainUsersPath).once('value');
      const mainUsers = mainUsersSnapshot.val() || {};
      
      for (const uid in mainUsers) {
        if (mainUsers[uid].id === managerName) {
          targetUid = uid;
          break;
        }
      }
    }
    
    if (!targetUid) {
      targetUid = db.ref().push().key;
    }
    
    await db.ref(`${scheduleCheckPath}/${targetUid}`).set({
      lastCheckDate: now,
      checkedBy: user.email,
      managerName: managerName,
      uid: targetUid,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    
    alert(`${managerName} 담당자의 일정 확인이 완료되었습니다.`);
    
    loadManagerScheduleStatus();
  } catch (error) {
    console.error('일정 확인 처리 오류:', error);
    alert('일정 확인 처리 중 오류가 발생했습니다.');
  }
}

function getDaysSinceCheck(lastCheck) {
  const checkDate = lastCheck ? new Date(lastCheck) : new Date('2025-05-29');
  const today = new Date();
  const diffTime = today - checkDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function sortManagerStatus() {
  displayManagerStatus();
}

async function confirmCurrentUserSchedule() {
  const user = auth.currentUser;
  if (!user) {
    alert('로그인이 필요합니다.');
    return;
  }
  
  try {
    const now = new Date().toISOString();
    const userEmail = user.email;
    
    const mainUsersSnapshot = await db.ref(mainUsersPath).once('value');
    const mainUsers = mainUsersSnapshot.val() || {};
    
    let userName = '';
    let userInfo = null;
    
    for (const uid in mainUsers) {
      if (mainUsers[uid].email === userEmail) {
        userName = mainUsers[uid].id || userEmail.split('@')[0];
        userInfo = mainUsers[uid];
        break;
      }
    }
    
    if (!userName) {
      userName = userEmail.split('@')[0];
    }
    
    console.log('일정 확인 처리:', {
      uid: user.uid,
      email: userEmail,
      name: userName,
      date: now
    });
    
    await db.ref(`${scheduleCheckPath}/${user.uid}`).set({
      lastCheckDate: now,
      checkedBy: userEmail,
      managerName: userName,
      uid: user.uid,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    
    await db.ref(`as-service/user_meta/${user.uid}`).update({
      lastScheduleCheck: now,
      userName: userName,
      email: userEmail
    });
    
    alert(`${userName}님의 일정 확인이 완료되었습니다.`);
    
    if (document.getElementById('managerStatusModal').style.display === 'block') {
      loadManagerScheduleStatus();
    }
  } catch (error) {
    console.error('일정 확인 처리 오류:', error);
    alert('일정 확인 처리 중 오류가 발생했습니다.');
  }
}

function toggleManagerStatusFullscreen() {
  const modal = document.getElementById('managerStatusModal');
  modal.classList.toggle('fullscreen');
}

async function showHistoryData(project) {
  if (!project) {
    alert("공번(수익프로젝트) 정보가 없습니다.");
    return;
  }
  
  try {
    const currentRow = asData.find(x => x.공번 === project);
    if (!currentRow) {
      alert("해당 공번의 데이터를 찾을 수 없습니다.");
      return;
    }
    
    const snapshot = await getProjectHistoryRef(project).once('value');
    const historyData = snapshot.val() || {};
    
    const uniqueRecords = new Map();
    let recordIndex = 0;
    
    // 히스토리 데이터를 먼저 처리
    Object.entries(historyData).forEach(([historyId, rec]) => {
      if (!rec.AS접수일자) return;
      
      // 더 정확한 중복 체크를 위해 날짜와 내용의 해시를 생성
      const dateStr = rec.AS접수일자;
      const planStr = (rec.조치계획 || '').trim();
      const recStr = (rec.접수내용 || '').trim();
      const resStr = (rec.조치결과 || '').trim();
      
      // 중복 체크를 위한 고유 키 생성
      const uniqueKey = `${dateStr}_${planStr.substring(0, 30)}_${recStr.substring(0, 30)}_${resStr.substring(0, 30)}`;
      
      if (!uniqueRecords.has(uniqueKey)) {
        uniqueRecords.set(uniqueKey, {
          id: historyId,
          project: project,
          asDate: dateStr,
          plan: planStr,
          rec: recStr,
          res: resStr,
          tEnd: rec.기술적종료일 || '',
          aiSummary: rec.aiSummary || ''
        });
      }
    });
    
    // 현재 데이터 처리 - 히스토리에 없는 경우만 추가
    if (currentRow["AS접수일자"] && (currentRow.접수내용 || currentRow.조치결과)) {
      const dateStr = currentRow["AS접수일자"];
      const planStr = (currentRow.조치계획 || '').trim();
      const recStr = (currentRow.접수내용 || '').trim();
      const resStr = (currentRow.조치결과 || '').trim();
      
      const currentKey = `${dateStr}_${planStr.substring(0, 30)}_${recStr.substring(0, 30)}_${resStr.substring(0, 30)}`;
      
      // 이미 히스토리에 동일한 데이터가 있는지 확인
      let isDuplicate = false;
      for (const [key, record] of uniqueRecords) {
        if (record.asDate === dateStr && 
            record.plan === planStr && 
            record.rec === recStr && 
            record.res === resStr) {
          isDuplicate = true;
          break;
        }
      }
      
      // 중복이 아닌 경우만 추가
      if (!isDuplicate && !uniqueRecords.has(currentKey)) {
        uniqueRecords.set(currentKey, {
          id: `current_${recordIndex++}`,
          project: project,
          asDate: dateStr,
          plan: planStr,
          rec: recStr,
          res: resStr,
          tEnd: currentRow["기술적종료일"] || '',
          aiSummary: ''
        });
      }
    }
    
    let allRecords = Array.from(uniqueRecords.values());
    
    if (allRecords.length === 0) {
      alert("해당 공번에 AS 기록이 없습니다.");
      return;
    }
    
    // 날짜 순으로 정렬 (최신순)
    allRecords.sort((a, b) => {
      const dateA = new Date(a.asDate || '1900-01-01');
      const dateB = new Date(b.asDate || '1900-01-01');
      return dateB - dateA;
    });
    
    console.log('히스토리 데이터 조회 결과:', {
      project: project,
      totalRecords: allRecords.length,
      recordsWithAI: allRecords.filter(r => r.aiSummary && r.aiSummary.trim()).length,
      records: allRecords
    });
    
    openHistoryDataModal(allRecords, project, currentRow, true);
    
  } catch (err) {
    console.error("히스토리 데이터 조회 오류:", err);
    alert("히스토리 데이터 조회 중 오류가 발생했습니다.");
  }
}

function openHistoryDataModal(records, project, rowData, fullscreen = false) {
  const existingModal = document.getElementById('historyDataModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'historyDataModal';
  modal.style.cssText = 'display: block; position: fixed; z-index: var(--z-modal-higher); left: 0; top: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5);';
  
  if (fullscreen) {
    modal.classList.add('fullscreen');
    modal.style.background = 'rgba(0, 0, 0, 0.7)';
    modal.style.zIndex = '10015';
    modal.style.position = 'fixed';
  }

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  if (fullscreen) {
    modalContent.style.cssText = 'background: #fff; width: 100% !important; height: 100% !important; max-width: 100%; max-height: 100%; margin: 0 !important; border-radius: 0; padding: 20px; position: relative; overflow-y: auto;';
  } else {
    modalContent.style.cssText = 'background: #fff; margin: 5% auto; width: 1000px; border-radius: 6px; padding: 20px; position: relative; max-height: 85%; overflow-y: auto;';
  }
  
  const closeBtn = document.createElement('span');
  closeBtn.className = 'close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => modal.remove();
  modalContent.appendChild(closeBtn);

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.style.cssText = 'position:absolute; right:45px; top:10px; font-size:0.85em; background:#666; color:#fff; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;';
  fullscreenBtn.textContent = '전체화면';
  fullscreenBtn.onclick = () => toggleHistoryDataFullscreen();
  modalContent.appendChild(fullscreenBtn);
  
  const title = document.createElement('h2');
  title.textContent = `히스토리 데이터 - ${project}`;
  modalContent.appendChild(title);
  
  const subtitle = document.createElement('p');
  subtitle.style.cssText = 'font-size:0.85em; color:#666; margin-bottom:20px;';
  subtitle.textContent = `${rowData.shipName || 'N/A'} (${rowData.shipowner || 'N/A'})`;
  modalContent.appendChild(subtitle);
  
  const allAiSummaryBtn = document.createElement('button');
  allAiSummaryBtn.textContent = '전체 AI 요약';
  allAiSummaryBtn.style.cssText = 'background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-bottom: 20px; margin-right: 10px;';
  allAiSummaryBtn.onclick = () => {
    summarizeAllHistoryRecords(records, project);
  };
  modalContent.appendChild(allAiSummaryBtn);
  
  const table = document.createElement('table');
  table.id = 'historyTable';
  table.style.cssText = 'width: 100%; border-collapse: collapse; margin-top: 10px;';
  
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background: #f8f9fa;">
      <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 200px;">AI 요약</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 120px;">AS접수일자</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">조치계획</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">접수내용</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">조치결과</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 120px;">기술적종료일</th>
    </tr>
  `;
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  records.forEach((rec, index) => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-record-index', index);
    
    const aiTd = document.createElement('td');
    aiTd.style.cssText = 'border: 1px solid #ddd; padding: 8px; text-align: center; vertical-align: middle;';
    
    createAiSummaryCell(aiTd, rec, index);
    tr.appendChild(aiTd);
    
    ['asDate', 'plan', 'rec', 'res', 'tEnd'].forEach((field, idx) => {
      const td = document.createElement('td');
      td.style.cssText = 'border: 1px solid #ddd; padding: 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      
      const value = rec[field] || '-';
      td.textContent = value;
      td.title = value;
      
      if (value !== '-' && value.trim() !== '') {
        td.style.cursor = 'pointer';
        td.style.backgroundColor = '#f8f9fa';
        td.style.textDecoration = 'underline';
        td.style.color = '#007bff';
        td.classList.add('history-clickable-cell');
        
        td.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          openContentModalOverHistory(value);
        };
        
        td.addEventListener('mouseenter', function() {
          this.style.backgroundColor = '#e3f2fd';
          this.style.transform = 'scale(1.02)';
        });
        
        td.addEventListener('mouseleave', function() {
          this.style.backgroundColor = '#f8f9fa';
          this.style.transform = 'scale(1)';
        });
      }
      
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  modalContent.appendChild(table);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

function createAiSummaryCell(cell, record, index) {
  cell.innerHTML = '';
  
  if (record.aiSummary && record.aiSummary.trim()) {
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'ai-summary-display';
    summaryDiv.style.cssText = 'background: #e8f5e8; border: 1px solid #28a745; border-radius: 4px; padding: 6px; margin-bottom: 4px; font-size: 0.75em; max-height: 80px; overflow-y: auto; line-height: 1.3; word-break: break-word;';
    summaryDiv.textContent = record.aiSummary;
    summaryDiv.title = record.aiSummary;
    cell.appendChild(summaryDiv);
    
    const resummaryBtn = document.createElement('button');
    resummaryBtn.textContent = '재요약';
    resummaryBtn.style.cssText = 'background: #ffc107; color: #212529; border: none; padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 0.7em; display: block; width: 100%;';
    resummaryBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      summarizeHistoryRecord(record, index);
    };
    cell.appendChild(resummaryBtn);
  } else {
    const summaryBtn = document.createElement('button');
    summaryBtn.textContent = 'AI 요약';
    summaryBtn.style.cssText = 'background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 0.8em; width: 100%;';
    summaryBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      summarizeHistoryRecord(record, index);
    };
    cell.appendChild(summaryBtn);
  }
}

async function summarizeAllHistoryRecords(records, project) {
  if (!records || records.length === 0) {
    alert('요약할 레코드가 없습니다.');
    return;
  }
  
  const recordsToSummarize = records.filter(rec => !rec.aiSummary || !rec.aiSummary.trim());
  
  if (recordsToSummarize.length === 0) {
    alert('모든 레코드가 이미 요약되어 있습니다.');
    return;
  }
  
  if (!confirm(`${recordsToSummarize.length}개의 레코드를 AI 요약하시겠습니까?`)) {
    return;
  }
  
  showAiProgressModal();
  clearAiProgressText();
  document.getElementById('aiProgressText').textContent = `[전체 히스토리 요약 진행 중]\n총 ${recordsToSummarize.length}개 레코드\n\n`;
  
  let successCount = 0;
  let errorCount = 0;
  
  try {
    for (let i = 0; i < recordsToSummarize.length; i++) {
      const record = recordsToSummarize[i];
      const recordIndex = records.indexOf(record);
      
      updateAiProgressText(`[${i+1}/${recordsToSummarize.length}] AS접수일자: ${record.asDate || 'N/A'} 처리 중...\n`);
      
      try {
        const basePrompt = g_aiConfig.promptRow || "접수내용과 조치결과를 간단히 요약해주세요.";
        const textOriginal = 
          `AS접수일자: ${record.asDate || 'N/A'}\n` +
          `조치계획:\n${record.plan || "없음"}\n\n` +
          `접수내용:\n${record.rec || "없음"}\n\n` +
          `조치결과:\n${record.res || "없음"}\n`;

        const finalPrompt = basePrompt + "\n\n" + textOriginal;
        const summary = await callAiForSummary(finalPrompt);
        
        if (summary && summary.trim()) {
          record.aiSummary = summary;
          
          if (record.id && record.id.startsWith('current_')) {
            const newHistoryId = getProjectHistoryRef(project).push().key;
            await db.ref(`${aiHistoryPath}/${project}/${newHistoryId}`).set({
              project: project,
              AS접수일자: record.asDate,
              조치계획: record.plan,
              접수내용: record.rec,
              조치결과: record.res,
              기술적종료일: record.tEnd,
              aiSummary: summary,
              timestamp: new Date().toISOString()
            });

            record.id = newHistoryId;
          } else {
            await db.ref(`${aiHistoryPath}/${project}/${record.id}/aiSummary`).set(summary);
          }
          
          updateHistoryTableRow(recordIndex, record);
          
          updateAiProgressText(`✓ 완료: ${summary.substring(0, 50)}...\n\n`);
          successCount++;
        } else {
          updateAiProgressText(`✗ 실패: AI 요약 결과가 비어있음\n\n`);
          errorCount++;
        }
      } catch (error) {
        console.error(`레코드 ${i+1} 요약 오류:`, error);
        updateAiProgressText(`✗ 실패: ${error.message}\n\n`);
        errorCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    updateAiProgressText(`\n=== 전체 요약 완료 ===\n성공: ${successCount}개\n실패: ${errorCount}개`);
    
    addHistory(`히스토리 전체 AI 요약 완료 - [${project}] 성공: ${successCount}, 실패: ${errorCount}`);
    
    if (errorCount > 0) {
      alert(`전체 AI 요약 완료\n성공: ${successCount}개\n실패: ${errorCount}개\n\n일부 항목은 요약에 실패했습니다.`);
    } else {
      alert(`전체 AI 요약 완료: ${successCount}개 항목`);
    }
    
  } catch (error) {
    console.error('전체 히스토리 요약 오류:', error);
    alert('전체 히스토리 요약 중 오류가 발생했습니다.');
  } finally {
    setTimeout(() => closeAiProgressModal(), 3000);
  }
}

async function summarizeHistoryRecord(record, recordIndex) {
  if (!record || (!record.rec && !record.res)) {
    alert("요약할 내용이 없습니다.");
    return;
  }
  
  const basePrompt = g_aiConfig.promptRow || "접수내용과 조치결과를 간단히 요약해주세요.";
  const textOriginal = 
    `AS접수일자: ${record.asDate || 'N/A'}\n` +
    `조치계획:\n${record.plan || "없음"}\n\n` +
    `접수내용:\n${record.rec || "없음"}\n\n` +
    `조치결과:\n${record.res || "없음"}\n`;

  const finalPrompt = basePrompt + "\n\n" + textOriginal;

  showAiProgressModal();
  clearAiProgressText();
  document.getElementById('aiProgressText').textContent = "[히스토리 단일 레코드 요약 진행 중]\n\n";

  try {
    const summary = await callAiForSummary(finalPrompt);
    
    if (!summary || !summary.trim()) {
      alert("AI 요약 실패 (빈 값 반환)");
      return;
    }
    
    record.aiSummary = summary;
    
    const project = record.project || '';
    if (record.id && record.id.startsWith('current_')) {
      const newHistoryId = getProjectHistoryRef(project).push().key;
      await db.ref(`${aiHistoryPath}/${project}/${newHistoryId}`).set({
        project: project,
        AS접수일자: record.asDate,
        조치계획: record.plan,
        접수내용: record.rec,
        조치결과: record.res,
        기술적종료일: record.tEnd,
        aiSummary: summary,
        timestamp: new Date().toISOString()
      });

      record.id = newHistoryId;
    } else if (record.id) {
      await db.ref(`${aiHistoryPath}/${project}/${record.id}/aiSummary`).set(summary);
    }
    
    updateHistoryTableRow(recordIndex, record);
    
    addHistory(`히스토리 AI 요약 완료 - [${record.project || 'N/A'}] ${record.asDate}`);
    alert("AI 요약이 완료되어 저장되었습니다.");
  } catch (err) {
    console.error("히스토리 AI 요약 오류:", err);
    alert("AI 요약 처리 중 오류가 발생했습니다.");
  } finally {
    closeAiProgressModal();
  }
}

function updateHistoryTableRow(rowIndex, record) {
  const modal = document.getElementById('historyDataModal');
  if (!modal) return;
  
  const table = modal.querySelector('#historyTable tbody');
  if (!table) return;
  
  let tr = table.children[rowIndex];
  if (!tr) {
    tr = table.querySelector(`tr[data-record-index="${rowIndex}"]`);
  }
  
  if (!tr) return;
  
  const aiTd = tr.children[0];
  if (!aiTd) return;
  
  createAiSummaryCell(aiTd, record, rowIndex);
}

function openContentModalOverHistory(text) {
  const historyModal = document.getElementById('historyDataModal');
  if (!historyModal) {
    console.error('히스토리 모달을 찾을 수 없습니다.');
    return;
  }
  
  const existingContentModal = historyModal.querySelector('.history-content-overlay');
  if (existingContentModal) {
    existingContentModal.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'history-content-overlay';
  overlay.style.cssText = `
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.8) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 9999 !important;
    backdrop-filter: blur(4px) !important;
  `;
  
  const contentBox = document.createElement('div');
  contentBox.style.cssText = `
    background: #fff !important;
    width: 80% !important;
    max-width: 800px !important;
    max-height: 80% !important;
    border-radius: 12px !important;
    padding: 30px !important;
    position: relative !important;
    overflow-y: auto !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
    border: 3px solid #007bff !important;
    animation: contentModalSlideIn 0.3s ease-out !important;
  `;
  
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    position: absolute !important;
    right: 15px !important;
    top: 15px !important;
    font-size: 28px !important;
    cursor: pointer !important;
    color: #999 !important;
    width: 32px !important;
    height: 32px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 50% !important;
    transition: all 0.3s ease !important;
    z-index: 1 !important;
  `;
  
  closeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    overlay.remove();
  });
  
  closeBtn.addEventListener('mouseenter', function() {
    this.style.color = '#333';
    this.style.background = '#f8f9fa';
  });
  
  closeBtn.addEventListener('mouseleave', function() {
    this.style.color = '#999';
    this.style.background = 'transparent';
  });
  
  const title = document.createElement('h2');
  title.textContent = '전체 내용';
  title.style.cssText = `
    margin-top: 0 !important;
    margin-bottom: 20px !important;
    color: #007bff !important;
    font-size: 1.4em !important;
    font-weight: 600 !important;
    padding-right: 40px !important;
  `;
  
  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = convertMarkdownToHTML(text);
  contentDiv.style.cssText = `
    white-space: pre-wrap !important;
    line-height: 1.6 !important;
    font-size: 1em !important;
    max-height: 400px !important;
    overflow-y: auto !important;
    border: 2px solid #e9ecef !important;
    padding: 20px !important;
    border-radius: 8px !important;
    background: #fafbfc !important;
  `;
  
  contentDiv.innerHTML += `
    <style>
      .history-content-overlay div::-webkit-scrollbar {
        width: 8px;
      }
      .history-content-overlay div::-webkit-scrollbar-track {
        background: #f1f3f4;
        border-radius: 4px;
      }
      .history-content-overlay div::-webkit-scrollbar-thumb {
        background: #c1c8cd;
        border-radius: 4px;
      }
    </style>
  `;
  
  contentBox.appendChild(closeBtn);
  contentBox.appendChild(title);
  contentBox.appendChild(contentDiv);
  overlay.appendChild(contentBox);
  
  historyModal.appendChild(overlay);
  
  const escapeHandler = function(e) {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.remove();
      document.removeEventListener('keydown', escapeHandler);
    }
  });
  
  contentBox.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  console.log('히스토리 내부 내용 모달 생성됨');
}

function toggleHistoryDataFullscreen() {
  const modal = document.getElementById('historyDataModal');
  modal.classList.toggle('fullscreen');
}

function openContentModalAsWindow(text) {
  const htmlText = convertMarkdownToHTML(text);
  document.getElementById('contentText').innerHTML = htmlText;
  const modal = document.getElementById('contentModal');
  modal.style.display = 'block';
  modal.style.zIndex = '10001';
  
  modal.classList.remove('fullscreen');
  
  const modalContent = modal.querySelector('.modal-content');
  modalContent.style.cssText = 'background: #fff; margin: 5% auto; width: 800px; max-width: 95%; border-radius: 12px; padding: 30px; position: relative; max-height: 85%; overflow-y: auto;';
}

/** ==================================
 *  번역 기능
 * ===================================*/
async function translateStatusField() {
  if (currentLanguage === 'ko') {
    alert('한국어가 선택된 상태에서는 번역할 필요가 없습니다.');
    return;
  }
  
  const rows = document.querySelectorAll('#asBody tr');
  if (rows.length === 0) {
    alert('번역할 데이터가 없습니다.');
    return;
  }
  
  const translationDirection = getTranslationDirection(currentLanguage);
  if (!translationDirection) {
    alert('번역할 언어가 설정되지 않았습니다.');
    return;
  }
  
  const targetLangName = {
    'en': '영어',
    'zh': '중국어', 
    'ja': '일본어'
  }[translationDirection.to] || translationDirection.to;
  
  if (!confirm(`현황 필드를 ${targetLangName}로 번역하시겠습니까?`)) {
    return;
  }
  
  const progressIndicator = document.createElement('div');
  progressIndicator.className = 'translation-progress';
  progressIndicator.innerHTML = `
    <div class="translation-spinner"></div>
    <div>${targetLangName}로 번역 중... (0/${rows.length})</div>
  `;
  document.body.appendChild(progressIndicator);
  
  document.getElementById('asTable').classList.add('translating');
  document.getElementById('translateBtn').disabled = true;
  
  try {
    const updates = {};
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const checkbox = row.querySelector('.rowSelectChk');
        if (!checkbox) continue;
        
        const uid = checkbox.dataset.uid;
        if (!uid) continue;
        
        const statusCell = row.querySelector('td[data-field="현황"] input');
        if (!statusCell || !statusCell.value.trim()) continue;
        
        const originalText = statusCell.value.trim();
        
        const rowData = asData.find(r => r.uid === uid);
        if (!rowData) continue;
        
        const currentTranslationKey = `현황번역_${currentLanguage}`;
        if (rowData[currentTranslationKey] && rowData.현황 === originalText) {
          const translationCell = row.querySelector('td[data-field="현황번역"] input');
          if (translationCell) {
            translationCell.value = rowData[currentTranslationKey];
          }
          successCount++;
        } else {
          try {
            const translatedText = await translateText(originalText, translationDirection.to);
            
            if (translatedText && translatedText.trim()) {
              const translationCell = row.querySelector('td[data-field="현황번역"] input');
              if (translationCell) {
                translationCell.value = translatedText;
              }
              
              rowData.현황번역 = translatedText;
              rowData[currentTranslationKey] = translatedText;
              updates[`${asPath}/${uid}/현황번역`] = translatedText;
              updates[`${asPath}/${uid}/${currentTranslationKey}`] = translatedText;
              successCount++;
            } else {
              console.error(`행 ${i+1} 번역 결과가 비어있음`);
              errorCount++;
            }
          } catch (translationError) {
            console.error(`행 ${i+1} 번역 오류:`, translationError);
            errorCount++;
          }
        }
        
        progressIndicator.querySelector('div:last-child').textContent = 
          `${targetLangName}로 번역 중... (${i+1}/${rows.length}) - 성공: ${successCount}, 실패: ${errorCount}`;
        
      } catch (rowError) {
        console.error(`행 ${i+1} 처리 오류:`, rowError);
        errorCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      addHistory(`현황 번역(${targetLangName}) 완료 - 성공: ${successCount}, 실패: ${errorCount}`);
    }
    
    if (errorCount > 0) {
      alert(`${targetLangName} 번역 완료: ${successCount}개 성공, ${errorCount}개 실패\n\n일부 항목은 번역에 실패했습니다.`);
    } else {
      alert(`${targetLangName} 번역 완료: ${successCount}개 항목`);
    }
    
  } catch (error) {
    console.error('번역 처리 중 오류:', error);
    alert('번역 처리 중 오류가 발생했습니다.');
  } finally {
    if (document.body.contains(progressIndicator)) {
      document.body.removeChild(progressIndicator);
    }
    
    document.getElementById('asTable').classList.remove('translating');
    document.getElementById('translateBtn').disabled = false;
  }
}

async function translateText(text, targetLang) {
  try {
    if (!text || text.trim() === '') return '';

    try {
      console.log("LibreTranslate API 시도 중...");
      const libreResult = await tryLibreTranslate(text, targetLang);
      console.log("LibreTranslate 성공!");
      return libreResult;
    } catch (libreError) {
      console.error("LibreTranslate API 실패:", libreError);
      
      console.log("MyMemory API로 대체 시도 중...");
      const myMemoryResult = await tryMyMemoryTranslate(text, targetLang);
      console.log("MyMemory 번역 성공!");
      return myMemoryResult;
    }
  } catch (error) {
    console.error('모든 번역 API 실패:', error);
    throw new Error('번역 서비스를 사용할 수 없습니다.');
  }
}

async function tryLibreTranslate(text, targetLang) {
  const apiUrl = 'https://libretranslate.com/translate';
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: 'ko',
        target: targetLang,
        format: 'text',
        api_key: ''
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.translatedText) {
      return data.translatedText;
    } else {
      throw new Error('번역 결과가 없습니다.');
    }
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function tryMyMemoryTranslate(text, targetLang) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  let translatedText = "";
  
  for (const sentence of sentences) {
    if (!sentence.trim()) continue;
    
    const langCodeMap = {
      'en': 'en',
      'zh': 'zh-CN',
      'ja': 'ja'
    };
    const mappedTargetLang = langCodeMap[targetLang] || targetLang;
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sentence)}&langpair=ko|${mappedTargetLang}&de=a@example.com`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.responseData && data.responseData.translatedText) {
        translatedText += data.responseData.translatedText + " ";
      } else {
        throw new Error('MyMemory 번역 결과가 없습니다.');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  return translatedText.trim();
}

function getTargetLanguageCode(currentLang) {
  const languageMap = {
    'ko': 'ko',
    'en': 'en',
    'zh': 'zh',
    'ja': 'ja'
  };
  
  return languageMap[currentLang] || 'en';
}

function getTranslationDirection(currentLang) {
  if (currentLang === 'ko') {
    return null;
  }
  return { from: 'ko', to: getTargetLanguageCode(currentLang) };
}

/** ==================================
 *  종료
 * ===================================*/
window.addEventListener('beforeunload', () => {
  if (modifiedRows.size > 0) {
    return '저장되지 않은 변경사항이 있습니다. 정말 페이지를 떠나시겠습니까?';
  }
});

window.addEventListener('error', (event) => {
  console.error('전역 오류 발생:', {
    message: event.error?.message || '알 수 없는 오류',
    filename: event.filename || '알 수 없는 파일',
    lineno: event.lineno || '알 수 없는 라인',
    colno: event.colno || '알 수 없는 컬럼',
    stack: event.error?.stack || '스택 정보 없음'
  });
  
  if (event.error?.message?.includes('Firebase')) {
    console.error('Firebase 관련 오류 - 연결 상태를 확인하세요');
  } else if (event.error?.message?.includes('fetch')) {
    console.error('네트워크 관련 오류 - 인터넷 연결을 확인하세요');
  } else if (event.error?.message?.includes('null')) {
    console.error('요소 접근 오류 - DOM이 완전히 로드되지 않았을 수 있습니다');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('처리되지 않은 Promise 거부:', event.reason);
  event.preventDefault();
});

if (window.performance) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        console.log('페이지 로드 성능:', {
          loadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart),
          domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
          firstPaint: Math.round(perfData.responseEnd - perfData.fetchStart)
        });
      }
    }, 0);
  });
}

console.log('AS 현황 관리 시스템 스크립트 로드 완료');
console.log('버전: 3.0.0 (개선된 조회 기능, 실시간 필터링, 성능 최적화)');
console.log('주요 기능: 다국어 지원, AI 요약, API 연동, 히스토리 관리, 담당자별 현황, 경과일 필터링');
