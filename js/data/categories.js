// js/data/categories.js
// 잡도리 수정 제안 5개 카테고리 정의 (라벨 / 색상 / 배경 / 제안 사유 템플릿)

export const CATEGORIES = {
  company:  { label: '회사명',      color: '#2563FF', bg: '#E7EEFF', reason: '이전 회사명이 본문에 남아 있어 목표 회사명으로 교체합니다.' },
  keyword:  { label: '인재상·가치', color: '#0E9F8E', bg: '#E1F5F2', reason: '목표 회사의 미션·가치에 맞춰 공감 포인트를 조정합니다.' },
  position: { label: '직군·포지션', color: '#7C3AED', bg: '#F1EBFE', reason: '지원하는 직군에 맞는 표현으로 바꿉니다.' },
  grammar:  { label: '문장·맞춤법', color: '#D97706', bg: '#FDF1E1', reason: '장황한 표현을 구체적이고 간결하게 다듬습니다.' },
  tone:     { label: '지원동기 톤', color: '#E11D70', bg: '#FCE6F0', reason: '지원동기 톤을 목표 회사의 서비스 톤에 맞춥니다.' },
};

// 제안 노출/적용 순서
export const CATEGORY_ORDER = ['company', 'keyword', 'position', 'grammar', 'tone'];
