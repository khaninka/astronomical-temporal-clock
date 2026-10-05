async function enableActionSidePanel() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

enableActionSidePanel().catch((error) => {
  console.error('Could not configure the clock side panel.', error);
});
