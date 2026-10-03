



const SUPABASE_URL = "https://kbinqaibixzoeeaaglta.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XvKQazsiIWk7KvMFCBVgzA_kEJK68Ux";

// Initialize Supabase Client if credentials are provided
let supabaseClient = null;
if (typeof window.supabase !== "undefined" && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Wait for the HTML document to fully load before running JavaScript
document.addEventListener("DOMContentLoaded", () => {

  /* ------------------------------------------------------------------------
     2. MOBILE NAVIGATION MENU TOGGLE
     Opens and closes the navigation menu when hamburger button is clicked.
  ------------------------------------------------------------------------ */
  const mobileToggle = document.querySelector("#mobileMenuBtn");
  const navMenu = document.querySelector(".menu");

  if (mobileToggle && navMenu) {
    // When hamburger button is clicked, toggle the 'open' class
    mobileToggle.addEventListener("click", () => {
      navMenu.classList.toggle("open");
    });

    // Close the menu if user clicks anywhere outside


    document.addEventListener("click", (event) => {
      if (!navMenu.contains(event.target) && !mobileToggle.contains(event.target)) {
        navMenu.classList.remove("open");
      }
    });

    // Close the menu when any navigation link is clicked
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("open");
      });
    });
  }

  /* ------------------------------------------------------------------------
     3. REQUEST A CALLBACK & BATCH INFO FORM (SUPABASE BACKEND)
     Captures user inputs and stores the enquiry directly into Supabase.
  ------------------------------------------------------------------------ */


  const contactForm = document.querySelector("#contactForm");
  const formStatus = document.querySelector("#formStatus");
  const submitBtn = document.querySelector("#submitBtn") || (contactForm ? contactForm.querySelector("button[type='submit']") : null);

  // Helper function to display success or error messages on the page
  function showFormStatus(message, type) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.className = "form-status " + type; // Applies .success or .error CSS
    formStatus.style.display = "block";
  }

  if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
      // Prevent browser from reloading the page
      event.preventDefault();

      // Read form input values
      const nameInput = contactForm.querySelector("#name");
      const mobileInput = contactForm.querySelector("#mobile");
      const emailInput = contactForm.querySelector("#email");
      const courseSelect = contactForm.querySelector("#course");
      const timingSelect = contactForm.querySelector("#timing");
      const messageInput = contactForm.querySelector("#message");

      const studentName = nameInput ? nameInput.value.trim() : "";
      const mobileNumber = mobileInput ? mobileInput.value.trim() : "";
      const emailAddress = emailInput ? emailInput.value.trim() : "";
      const selectedCourse = courseSelect ? courseSelect.value : "";
      const selectedTiming = timingSelect ? timingSelect.value : "";
      const userMessage = messageInput ? messageInput.value.trim() : "";

      // Basic validation: Mobile number must be 10 digits
      if (mobileNumber.length < 10) {
        showFormStatus("Please enter a valid 10-digit mobile number.", "error");
        if (mobileInput) mobileInput.focus();
        return;
      }

      // Check that a course was selected
      if (!selectedCourse) {
        showFormStatus("Please select an interested course from the dropdown.", "error");
        if (courseSelect) courseSelect.focus();
        return;
      }

      // Change button state while saving
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving to Database... ⏳";
      }

      /* --------------------------------------------------------------------
         CASE A: Supabase is connected with real credentials
      -------------------------------------------------------------------- */
      if (supabaseClient) {
        try {
          // Insert the enquiry into the 'enquiries' table in Supabase
          const { data, error } = await supabaseClient
            .from("enquiries")
            .insert([
              {
                name: studentName,
                mobile: mobileNumber,
                email: emailAddress || null,
                course: selectedCourse,
                timing: selectedTiming || "Flexible",
                message: userMessage || null
              }
            ]);

          if (error) {
            console.error("Supabase Error:", error);
            showFormStatus("Error saving enquiry: " + error.message, "error");
          } else {
            showFormStatus(
              "✅ Thank you, " + studentName + "! Your enquiry has been saved to Supabase. Our academic counsellor will contact you shortly at " + mobileNumber + ".",
              "success"
            );
            contactForm.reset();
          }
        } catch (err) {
          console.error("Submission Exception:", err);
          showFormStatus("Failed to connect to database. Please check your internet connection.", "error");
        }
      } 
      /* --------------------------------------------------------------------
         CASE B: Supabase URL/Key is still the placeholder text
         (Shows friendly demo message and guides the user where to add keys)
      -------------------------------------------------------------------- */
      else {
        showFormStatus(
          "✅ Demo Submission Recorded! (To save to your live Supabase database, paste your SUPABASE_URL and SUPABASE_ANON_KEY at the top of script.js).",
          "success"
        );
        alert(
          "Thank you, " + studentName + "!\n\nYour enquiry for " + selectedCourse +
          " has been received.\n\n[Supabase Note]: To view this in your live Supabase dashboard, replace SUPABASE_URL and SUPABASE_ANON_KEY in script.js."
        );
        contactForm.reset();
      }

      // Restore submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Admission Enquiry";
      }
    });
  }

});
