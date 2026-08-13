import { createBdd, test as base } from 'playwright-bdd';
import { LoginPage } from '../../playwright/pages/LoginPage';

type BddFixtures = {
  loginPage: LoginPage;
};

export const test = base.extend<BddFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});

export const { Given, When, Then } = createBdd(test);
