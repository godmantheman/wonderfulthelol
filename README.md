# 하양아 - GitHub Pages 수정판

## 하얀 화면 해결 핵심

이 버전은 `vite.config.js`에 `base: "./"`가 들어가 있어서 GitHub Pages 저장소 경로 문제로 하얀 화면이 뜨는 일을 줄였습니다.

## GitHub Pages 배포 방법

1. 이 ZIP 압축을 풉니다.
2. 안에 있는 모든 파일과 폴더를 GitHub 저장소 루트에 올립니다.
   - 꼭 `.github/workflows/deploy.yml` 폴더도 같이 올라가야 합니다.
3. GitHub 저장소에서 `Settings` → `Pages`로 갑니다.
4. `Build and deployment`의 `Source`를 `GitHub Actions`로 바꿉니다.
5. 코드를 `main` 또는 `master` 브랜치에 push합니다.
6. `Actions` 탭에서 배포가 끝날 때까지 확인합니다.
7. `Settings` → `Pages`에 나온 주소로 접속합니다.

## 로컬 테스트

```bash
npm install
npm run dev
```

## 주의

- 마이크는 `https` 또는 `localhost`에서만 작동합니다.
- GitHub Pages 주소는 https라서 마이크 권한 요청은 가능하지만, 브라우저에서 마이크를 차단하면 직접 허용해야 합니다.
- API 키는 코드에 직접 넣지 말고 앱 설정창에 넣으세요.
