// The four character accounts, as people search lists them. Their profiles live in code
// (js/<name>-profile.js), not the database, so search has to add them itself. Kept separate so
// the header search doesn't load whole profile pages.
export const CHARACTERS = [
  { username: 'butters', display_name: 'Butters Stotch', avatar_color: '#f5c518', avatar_icon: 'books', character: true },
  { username: 'kyle', display_name: 'Kyle Broflovski', avatar_color: '#3fb950', avatar_icon: 'earflaps', character: true },
  { username: 'cartman', display_name: 'Eric Cartman', avatar_color: '#e5534b', avatar_icon: 'beanie', character: true },
  { username: 'kenny', display_name: 'Kenny McCormick', avatar_color: '#f2711c', avatar_icon: 'mittens', character: true },
];

/** Characters whose name or @username contains the search. */
export function findCharacters(query) {
  const q = String(query || '').trim().toLowerCase();
  return q ? CHARACTERS.filter((c) => c.username.includes(q) || c.display_name.toLowerCase().includes(q)) : [];
}
