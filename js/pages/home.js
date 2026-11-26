import { initPage } from '../layout.js';
import { $, esc } from '../ui.js';

const { profile } = await initPage();

if (profile?.username) {
  $('#hero-actions').innerHTML = `
    <a class="paper btn-paper" style="background-color:var(--green)" href="profile.html?u=${encodeURIComponent(profile.username)}">Go to your profile</a>`;
  $('.callout p').innerHTML = `<strong>Welcome back, ${esc(profile.display_name || profile.username)}.</strong> Episodes, diaries and reviews are on the way.`;
}
