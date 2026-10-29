export const LANGUAGES = [
  { id: 'cpp', label: 'C++', filename: 'solution.cpp' },
  { id: 'python', label: 'Python', filename: 'solution.py' },
];

export const languageLabel = (id) => LANGUAGES.find((l) => l.id === id)?.label || id;

export const languageFilename = (id) => LANGUAGES.find((l) => l.id === id)?.filename || `solution.${id}`;

export function getTemplate(problem, languageId) {
  const found = (problem?.templates || []).find((t) => t.language === languageId);
  return found?.code || '';
}

export function fallbackTemplate(languageId) {
  if (languageId === 'python') return 'def solve(nums):\n    # ここに書く\n    return None\n';
  return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // ここに書く\n    return 0;\n}\n';
}