// tabs.js
// Simple tab navigation for the NHS financial planning website.

/**
 * Open a tab section and update active button styling.
 * @param {Event|null} event - Click event from the tab button.
 * @param {string} tabId - ID of the section to show.
 */
function openTab(event, tabId) {
  const sections = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-link');

  // Hide all sections
  sections.forEach((section) => {
    section.style.display = 'none';
  });

  // Remove active class from all buttons
  buttons.forEach((button) => {
    button.classList.remove('active');
  });

  // Show the selected section
  const selectedSection = document.getElementById(tabId);
  if (selectedSection) {
    selectedSection.style.display = 'block';
  }

  // Add active class to the clicked button, or default to the first button
  const activeButton = event?.currentTarget || buttons[0];
  if (activeButton) {
    activeButton.classList.add('active');
  }
}

// When the page loads, open the budgeting tab by default.
document.addEventListener('DOMContentLoaded', () => {
  openTab(null, 'budgeting');
});
