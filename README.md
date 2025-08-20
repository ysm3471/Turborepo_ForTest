# Turborepo 및 Vercel을 활용한 페이지 제작

#### Turborepo를 활용하여 monorepo 구조의 프로젝트를 제작하였습니다.
#### 배포는 Vercel을 활용하여 진행하였으며 Github Actions로 ci/cd를 구성하였습니다.

#### 사용 기술 : Next.js, Typescript, Github Actions, Turborepo, Firebase
#### 테스트 툴 : Jest
<br/>

## 프로젝트 개요
### 페이지 소개
사용자(Client) 페이지 (https://turborepo-for-test-main-prod.vercel.app/)
<img width="1920" height="916" alt="vercel1" src="https://github.com/user-attachments/assets/4d6cd90e-9e89-4efc-854a-4a85e516798f" /><br/><br/>
관리자(Admin) 페이지 (https://turborepo-for-test-admin-prod.vercel.app/)
<img width="1920" height="919" alt="vercel2" src="https://github.com/user-attachments/assets/6fc2556f-43b9-41a1-992b-28e9391d2e2f" /><br/><br/>
Firebase DB
<img width="1867" height="919" alt="vercel3" src="https://github.com/user-attachments/assets/2fc949d8-f16e-42af-ba2b-972338c3e311" />

* Client 페이지에서 클릭한 버튼의 횟수를 Firebase에 저장하여 Admin 페이지에서 보여줍니다.
* 확장성과 효율성을 고려하여 DB에는 날짜를 포함한 데이터와 숫자별 횟수만 저장하는 데이터, 두 개의 테이블로 나누었습니다.
* Firebase에서 제공하는 Transaction 기능을 활용하여 조회수 업데이트를 진행합니다. 

### 핵심 코드 소개

#### 주요 코드 1 - Jest를 활용한 테스트 코드 작성

> Jest와 testing-library를 활용하여 클릭 시 조회수 증가와 UI를 테스트하였습니다.

```js
// Firebase 관련 함수 mocking. 실행되지 말아야 하는 테스트는 mocking 처리
jest.mock('@/Firebase/post/PostData', () => ({
  __esModule: true,
  default: jest.fn() // writeUserData
}));

jest.mock('@/Firebase/post/CntData', () => ({
  __esModule: true,
  default: jest.fn() // updateViewCnt
}));

describe('<Box />', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // 각 테스트 전에 mock 초기화
  });

  it('버튼 클릭 시 숫자가 화면에 표시된다', () => {
    render(<Box />);

    // 초기에는 num 박스 없음 
    expect(screen.queryByTestId('num')).toBeNull();

    const button = screen.getByRole('button', { name: '1' });
    fireEvent.click(button);

    // 클릭 후 h3에 숫자가 표시됨
    expect(screen.getByRole('heading', { level: 3, name: '1' })).toBeInTheDocument();
  });

  it('버튼 클릭 시 writeUserData와 updateViewCnt가 호출된다', () => {
    render(<Box />);

    const button = screen.getByRole('button', { name: '3' });
    fireEvent.click(button);

    expect(writeUserData).toHaveBeenCalledTimes(1);
    expect(writeUserData).toHaveBeenCalledWith(3);

    expect(updateViewCnt).toHaveBeenCalledTimes(1);
    expect(updateViewCnt).toHaveBeenCalledWith(3);
  });
});
}
```
Jest의 mock 기능을 사용하여 더미 함수로 테스트를 진행하였습니다. <br>
UI는 페이지 기능 플로우의 핵심인 클릭 후 사용자 화면에 해당 번호가 표시되는 기능을 확인하였습니다.

<img width="1554" height="763" alt="vercel5" src="https://github.com/user-attachments/assets/e2489aa5-c203-49b4-b519-538e5234ab81" /><br><br>


#### 주요 코드 2 - Gihub Actions workflow 파일 구성

> Github Actions를 활용해 프로젝트의 ci/cd를 구성하였습니다.<br>
> 테스트 코드의 삽입을 위하여 Vercel의 Github와 연동한 자동 배포를 이용하지 않고 따로 작성하였습니다.

```bash
name: CI/CD with Vercel

on:
  push:
    branches: 
      - dev
      - main
  pull_request: 
    branches: [dev,main]
    types: [closed]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      YARN_ENABLE_IMMUTABLE_INSTALLS: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20 
      - uses: ./.github/actions/setup    # action.yml에서 구성한 composite를 사용하여 yarn 환경을 세팅함
      - run: yarn build
      - run: yarn turbo run test 
      - uses: actions/upload-artifact@v4    # 빌드한 패키지 파일을 아래에서 사용
        with:
          name: build-output
          path: packages/ui/dist

  deploy-main:    # 메인 페이지 배포
    needs: test 
    runs-on: ubuntu-latest
    env:
      YARN_ENABLE_IMMUTABLE_INSTALLS: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: packages/ui/dist
      - name: Set project id
        run: |
          if [ "${GITHUB_REF}" == "refs/heads/main" ]; then    # 브런치에 따라서 배포할 환경을 변경
            echo "PROJECT_ID=turborepo-for-test-main-prod" >> $GITHUB_ENV
          else
            echo "PROJECT_ID=turborepo-for-test-main" >> $GITHUB_ENV
          fi 
      - uses: ./.github/actions/setup   # action.yml에서 구성한 composite를 사용하여 yarn 환경을 세팅함
      - run: npm run build --workspace=main
      - run: npm install --global vercel 
      - name: Link Vercel Project
        run: vercel link --yes --project $PROJECT_ID --token ${{ secrets.VERCEL_TOKEN }} 
      - run: vercel pull --yes --environment=production --token ${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --prod --token ${{ secrets.VERCEL_TOKEN }}
      - run: vercel deploy --prebuilt --prod --token ${{ secrets.VERCEL_TOKEN }}

  deploy-admin:    # admin 페이지 배포
    needs: test 
    runs-on: ubuntu-latest
    env:
      YARN_ENABLE_IMMUTABLE_INSTALLS: false
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: packages/ui/dist
      - name: Set project id
        run: |
          if [ "${GITHUB_REF}" == "refs/heads/main" ]; then    # 브런치에 따라서 배포할 환경을 변경
            echo "PROJECT_ID=turborepo-for-test-admin-prod" >> $GITHUB_ENV
          else
            echo "PROJECT_ID=turborepo-for-test-admin" >> $GITHUB_ENV
          fi 
      - uses: ./.github/actions/setup    # action.yml에서 구성한 composite를 사용하여 yarn 환경을 세팅함
      - run: npm run build --workspace=admin
      - run: npm install --global vercel
      - name: Link Vercel Project
        run: vercel link --yes --project $PROJECT_ID --token ${{ secrets.VERCEL_TOKEN }} 
      - run: vercel pull --yes --environment=production --token ${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --prod --token ${{ secrets.VERCEL_TOKEN }}
      - run: vercel deploy --prebuilt --prod --token ${{ secrets.VERCEL_TOKEN }}
```
실제 서비스 환경을 고려하여 dev와 prod 환경의 두 가지 페이지를 제작하였습니다.<br>
또한 monorepo기 때문에 if문을 활용해 admin과 main 빌드를 구분하여 배포하였습니다.

<img width="1911" height="798" alt="vercel4" src="https://github.com/user-attachments/assets/d2647ab8-bf65-4c48-80b2-465a1dec78c7" /><br>


#### 주요 코드 3 - 재사용성이 높은 컴포넌트의 패키지화

> Button 컴포넌트의 재사용성을 고려하여 패키지화를 진행하였습니다.<br>
> 테스트는 기존 테스트에 패키지용 테스트를 추가로 구성하여 진행하였습니다.

```js
// Button.test.tsx
import React from "react";
import '@testing-library/dom'
import { render, screen, fireEvent } from '@testing-library/react';
import Button from "./Button";

describe('<Button/>', () => {
  it('버튼 컴포넌트를 클릭하면 이벤트 발생', () => {
    const handleClick = jest.fn();  // 클릭 시 더미함수
    render(<Button num={1} handleClick={handleClick} selected={1} />)

    const button = screen.getByRole('button', { name: '1' })
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalled()  // 클릭하면 함수 호출
    expect(button.getAttribute("class")).toContain("selected")    // selected와 num이 같으면 class 변경
  })
})
```
Package 폴더를 만들어 공용 컴포넌트를 따로 빌드하였습니다.<br>
css의 경우 같이 배포하는 것보다는 monorepo 환경임을 고려해 Root 폴더에 style.css를 만들어 통합적으로 관리하였습니다.<br>
Github Actions에서는 artifact 기능을 활용하여 테스트 job에서 빌드된 컴포넌트를 재사용하였습니다.<br><br>

### 작업 후기
Vercel의 자동배포 기능을 이용하지 않고 새로 ci/cd를 구성한 점이 의미 있었다고 생각합니다.<br>
또한 Turborepo를 활용하여 각 프로젝트의 config 및 dependency 환경의 구성 및 분리 과정을 경험해볼 수 있었습니다.<br>
Jest와 Action를 설정하는 과정에서 많은 오류를 겪었지만 AI 도구를 적극적으로 활용하여 빠르게 문제를 해결할 수 있었습니다.<br>
새로운 기술의 작업은 에러 메세지를 분석하는 것이 어렵기 때문에 AI 활용 능력의 중요성을 느낄 수 있었습니다.









