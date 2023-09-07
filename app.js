document.getElementById("feedbackForm").addEventListener("click", function () {
  showForm("form1");
  hideForm("form2");
  highlightLink("feedbackForm");
  unhighlightLink("groupPlan");
});
document.getElementById("groupPlan").addEventListener("click", function () {
  showForm("form2");
  hideForm("form1");
  highlightLink("groupPlan");
  unhighlightLink("feedbackForm");
});

function showForm(formId) {
  var form = document.getElementById(formId);
  form.style.display = "flex";
}

function hideForm(formId) {
  var form = document.getElementById(formId);
  form.style.display = "none";
}
function highlightLink(linkId) {
  var link = document.getElementById(linkId);
  link.classList.add("selected");
}
function unhighlightLink(linkId) {
  var link = document.getElementById(linkId);
  link.classList.remove("selected");
}
