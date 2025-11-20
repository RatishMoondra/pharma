import { test, expect } from '@playwright/experimental-ct-react';
import VendorFormTestStory from '../stories/VendorForm.test-story.jsx';

test.describe('VendorForm', () => {
  test('renders create form with required fields', async ({ mount }) => {
    const component = await mount(<VendorFormTestStory />);

    await expect(component.getByLabel('Vendor Name')).toBeVisible();
    await expect(component.getByLabel('Vendor Type')).toBeVisible();
    await expect(component.getByLabel('Country')).toBeVisible();
  });
});
