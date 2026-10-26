# 🌱 냉장고 숲

개인용 식재료 재고관리 웹사이트. Vite + Supabase + GitHub Pages.

## 기능
- 귀여운 이모지 아이콘으로 식재료 등록·수정·삭제
- 냉장/냉동/실온 분류, 검색, 소비기한순 정렬
- 먹은 수량 차감, 재고 종류 수에 따른 배지
- 이메일/비밀번호 회원가입·로그인과 사용자별 클라우드 저장
- 재고 텍스트 공유(Web Share / 클립보드)
- 쿠팡·컬리·네이버 쇼핑 검색 링크, 배민 공식 홈페이지 연결

쇼핑몰 계정·구매내역·장바구니 API 연동은 포함하지 않습니다. B마트는 배민 페이지에서 앱을 연 뒤 선택해야 합니다. 공유는 목록 텍스트이며 공동 편집이나 공유 링크는 아닙니다.

## 실행
Node.js 22.12 이상에서:

```sh
npm ci
npm run dev
npm test
npm run build
```

로그인 전에는 샘플 재고를 브라우저에 임시 저장합니다. 로그인하면 별도의 빈 개인 냉장고가 열립니다. 체험 데이터는 자동 업로드되지 않습니다.

## Supabase
프로젝트 `fridge-inventory` / 서울 리전.
프런트엔드에는 공개용 publishable key만 포함합니다. 재고 테이블의 RLS 정책이 로그인한 소유자만 조회·추가·수정·삭제하도록 제한합니다.

배포 후 Authentication → URL Configuration에서 Site URL 및 Redirect URLs에 실제 GitHub Pages 주소를 등록하세요. 확인 이메일에서 인증 후 앱으로 돌아와 로그인합니다. 비밀번호 재설정은 현재 앱에 포함되지 않습니다.

## GitHub Pages
`hj37/fridge-inventory` 공개 저장소에 이 폴더의 소스를 올리고 Settings → Pages → Source를 GitHub Actions로 설정하세요. develop push 시 `.github/workflows/pages.yml`이 테스트·빌드·배포합니다.

무료 플랜의 한도와 일시중지 정책은 공급자 정책을 따릅니다. 유료 플랜이나 별도 유료 서비스를 활성화하지 마세요.
