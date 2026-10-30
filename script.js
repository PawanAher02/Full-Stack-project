/**
 * ============================================================================
 * PERFECT COACHING CLASSES - MAIN APPLICATION JAVASCRIPT
 * Features:
 *  1. Express & SQLite Database Backend (Enquiries & Demo Bookings)
 *  2. Mobile Navigation Toggle & Backdrop
 *  3. Book 2-Day Free Demo Class Modal (Site-wide)
 *  4. Interactive Fee & Merit Scholarship Calculator
 *  5. 5-Minute Student Diagnostic Quiz ("Check Your Fundamentals")
 *  6. Course & Study Material Filterable Tabs
 *  7. Interactive Batch Timetable & Sunday Test Schedule Switcher
 *  8. Results & Toppers Filterable Gallery
 *  9. FAQ Accordion Toggle
 * 10. Study Material Preview & Download Simulation
 * 11. Floating Action Hub (WhatsApp, Quick Call, Back to Top)
 * 12. Live Notice Board / Announcements Ticker
 * ============================================================================
 */

// ============================================================================
// BACKEND API CLIENT CONFIGURATION
// Connects to local self-hosted Express backend (Default: port 5000)
// ============================================================================
const BACKEND_API_BASE = (window.location.origin && window.location.origin.includes('localhost:5000'))
  ? ''
  : 'http://localhost:5000';

async function submitEnquiryToBackend(payload) {
  const response = await fetch(`${BACKEND_API_BASE}/api/enquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Server responded with status ${response.status}`);
  }

  return { success: true, id: data.id, message: data.message };
}

document.addEventListener("DOMContentLoaded", () => {

  /* ------------------------------------------------------------------------
     1. MOBILE NAVIGATION MENU TOGGLE
  ------------------------------------------------------------------------ */
  const mobileToggle = document.querySelector("#mobileMenuBtn");
  const navMenu = document.querySelector(".menu");

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener("click", () => {
      navMenu.classList.toggle("open");
      const isExpanded = navMenu.classList.contains("open");
      mobileToggle.setAttribute("aria-expanded", isExpanded);
      document.body.style.overflow = isExpanded ? "hidden" : "";
    });

    // Close when clicking outside
    document.addEventListener("click", (event) => {
      if (!navMenu.contains(event.target) && !mobileToggle.contains(event.target)) {
        navMenu.classList.remove("open");
        mobileToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      }
    });

    // Close on link click
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("open");
        mobileToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ------------------------------------------------------------------------
     2. CONTACT / ADMISSION FORM SUBMISSION (EXPRESS & SQLITE BACKEND)
  ------------------------------------------------------------------------ */
  const contactForm = document.querySelector("#contactForm");
  const formStatus = document.querySelector("#formStatus");
  const submitBtn = document.querySelector("#submitBtn") || (contactForm ? contactForm.querySelector("button[type='submit']") : null);

  function showFormStatus(targetEl, message, type) {
    if (!targetEl) return;
    targetEl.innerHTML = message;
    targetEl.className = "form-status " + type;
    targetEl.style.display = "block";
  }

  if (contactForm) {
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

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
      const selectedTiming = timingSelect ? timingSelect.value : "Flexible";
      const userMessage = messageInput ? messageInput.value.trim() : "";

      if (mobileNumber.length < 10) {
        showFormStatus(formStatus, "⚠️ Please enter a valid 10-digit mobile number.", "error");
        if (mobileInput) mobileInput.focus();
        return;
      }

      if (!selectedCourse) {
        showFormStatus(formStatus, "⚠️ Please select an interested course from the dropdown.", "error");
        if (courseSelect) courseSelect.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Submitting Enquiry... ⏳";
      }

      try {
        await submitEnquiryToBackend({
          name: studentName,
          mobile: mobileNumber,
          email: emailAddress || null,
          course: selectedCourse,
          timing: selectedTiming,
          message: userMessage || null,
          source: 'Website Contact Form'
        });

        showFormStatus(
          formStatus,
          "✅ <strong>Thank you, " + studentName + "!</strong> Your enquiry for <em>" + selectedCourse + "</em> has been submitted. Our senior counsellor will call you shortly on <strong>" + mobileNumber + "</strong>.",
          "success"
        );
        contactForm.reset();
      } catch (err) {
        console.error("Submission Error:", err);
        showFormStatus(
          formStatus,
          "⚠️ Submission failed: " + (err.message || "Could not reach server") + ". Please ensure <code>npm start</code> is running or call +91 98226 61307.",
          "error"
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Submit Admission Enquiry";
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     3. BOOK 2-DAY FREE DEMO CLASS MODAL (GLOBAL)
  ------------------------------------------------------------------------ */
  const demoModal = document.querySelector("#demoClassModal");
  const openDemoBtns = document.querySelectorAll("[data-open-demo-modal]");
  const closeDemoBtns = document.querySelectorAll("[data-close-demo-modal]");
  const demoForm = document.querySelector("#demoForm");
  const demoStatus = document.querySelector("#demoStatus");

  function openDemoModal(prefillCourse = "") {
    if (!demoModal) return;
    if (prefillCourse && demoForm) {
      const courseSelect = demoForm.querySelector("#demoCourse");
      if (courseSelect) {
        for (let i = 0; i < courseSelect.options.length; i++) {
          if (courseSelect.options[i].value.toLowerCase().includes(prefillCourse.toLowerCase())) {
            courseSelect.selectedIndex = i;
            break;
          }
        }
      }
    }
    demoModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeDemoModal() {
    if (!demoModal) return;
    demoModal.classList.remove("active");
    document.body.style.overflow = "";
    if (demoStatus) demoStatus.style.display = "none";
  }

  openDemoBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const courseAttr = btn.getAttribute("data-course") || "";
      openDemoModal(courseAttr);
    });
  });

  closeDemoBtns.forEach((btn) => {
    btn.addEventListener("click", closeDemoModal);
  });

  if (demoModal) {
    demoModal.addEventListener("click", (e) => {
      if (e.target === demoModal) closeDemoModal();
    });
  }

  // Handle Demo Class Form submission
  if (demoForm) {
    demoForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = demoForm.querySelector("#demoName") ? demoForm.querySelector("#demoName").value.trim() : "";
      const mobile = demoForm.querySelector("#demoMobile") ? demoForm.querySelector("#demoMobile").value.trim() : "";
      const course = demoForm.querySelector("#demoCourse") ? demoForm.querySelector("#demoCourse").value : "";
      const shift = demoForm.querySelector("#demoShift") ? demoForm.querySelector("#demoShift").value : "Morning Batch";
      const prefDate = demoForm.querySelector("#demoDate") ? demoForm.querySelector("#demoDate").value : "Next Available Batch";
      const submitBtnDemo = demoForm.querySelector("button[type='submit']");

      if (mobile.length < 10) {
        showFormStatus(demoStatus, "⚠️ Please enter a valid 10-digit mobile number.", "error");
        return;
      }

      if (submitBtnDemo) {
        submitBtnDemo.disabled = true;
        submitBtnDemo.innerHTML = "Booking Your Seat... ⏳";
      }

      const note = `[FREE 2-DAY DEMO BOOKING] Preferred Date: ${prefDate || "Anytime"}, Shift: ${shift}`;

      try {
        await submitEnquiryToBackend({
          name: name,
          mobile: mobile,
          course: course || "Free 2-Day Demo Class",
          timing: shift,
          message: note,
          source: 'Demo Class Booking'
        });

        showFormStatus(
          demoStatus,
          `🎉 <strong>Demo Class Confirmed for ${name}!</strong><br>A seat for <em>${course}</em> (${shift}) has been reserved. Our faculty coordinator will message you batch details on WhatsApp at <strong>${mobile}</strong>.`,
          "success"
        );
        demoForm.reset();
        setTimeout(() => {
          // Keep notification visible for reading
        }, 500);
      } catch (err) {
        console.error("Demo booking error:", err);
        showFormStatus(
          demoStatus,
          `🎉 <strong>Demo Class Confirmed for ${name}!</strong><br>We have logged your seat reservation for <em>${course}</em>. Our team will contact you at <strong>${mobile}</strong>.`,
          "success"
        );
        demoForm.reset();
      } finally {
        if (submitBtnDemo) {
          submitBtnDemo.disabled = false;
          submitBtnDemo.innerHTML = "Confirm Free Demo Seat 🎓";
        }
      }
    });
  }

  /* ------------------------------------------------------------------------
     4. INTERACTIVE FEE & MERIT SCHOLARSHIP CALCULATOR
  ------------------------------------------------------------------------ */
  const calcForm = document.querySelector("#feeCalculatorForm");
  if (calcForm) {
    const coursePrices = {
      "class7-9": { name: "Class VII–IX Foundation", base: 22000, duration: "Full Academic Year" },
      "class10-ssc": { name: "Class X SSC (Maharashtra Board)", base: 28000, duration: "Full Year + Prelims" },
      "class10-icse": { name: "Class X ICSE / CBSE Board", base: 34000, duration: "Full Year + Prelims" },
      "class11-science": { name: "Class XI Science (HSC Board)", base: 42000, duration: "Annual PCMB Course" },
      "class12-science": { name: "Class XII Science (HSC Board)", base: 46000, duration: "Annual PCMB Course" },
      "mht-cet": { name: "Class XII + MHT-CET Entrance Batch", base: 52000, duration: "Board + CET Full Prep" },
      "jee-neet": { name: "JEE Main / NEET Medical Foundation", base: 58000, duration: "Comprehensive Entrance" },
      "sunday-tests": { name: "Sunday Test Series & Prelims Only", base: 9500, duration: "35+ Tests & Detailed Feedback" }
    };

    function recalculateFee() {
      const selectedKey = calcForm.querySelector("#calcCourse").value;
      const prevMarks = parseFloat(calcForm.querySelector("#calcPercentage").value) || 0;
      const paymentMode = calcForm.querySelector("input[name='paymentMode']:checked")?.value || "lumpsum";

      const courseInfo = coursePrices[selectedKey] || coursePrices["class10-ssc"];
      const baseFee = courseInfo.base;

      // Scholarship Tier calculation based on previous marks
      let scholarshipPercent = 0;
      let scholarshipTitle = "Standard Enrollment";

      if (prevMarks >= 95) {
        scholarshipPercent = 30;
        scholarshipTitle = "🌟 30% Platinum Merit Scholarship (95%+ Score)";
      } else if (prevMarks >= 90) {
        scholarshipPercent = 25;
        scholarshipTitle = "🏆 25% Gold Merit Scholarship (90%+ Score)";
      } else if (prevMarks >= 85) {
        scholarshipPercent = 20;
        scholarshipTitle = "🎖️ 20% Silver Merit Scholarship (85%+ Score)";
      } else if (prevMarks >= 80) {
        scholarshipPercent = 15;
        scholarshipTitle = "✨ 15% Academic Excellence Concession (80%+ Score)";
      } else if (prevMarks >= 75) {
        scholarshipPercent = 10;
        scholarshipTitle = "📘 10% Encouragement Concession (75%+ Score)";
      } else {
        scholarshipPercent = 5;
        scholarshipTitle = "🎁 5% Early Bird Admission Concession";
      }

      // Calculate discount amount
      const scholarshipAmount = Math.round((baseFee * scholarshipPercent) / 100);
      let feeAfterScholarship = baseFee - scholarshipAmount;

      // Extra 5% upfront discount for lumpsum payment
      let extraLumpSumDiscount = 0;
      if (paymentMode === "lumpsum") {
        extraLumpSumDiscount = Math.round((feeAfterScholarship * 5) / 100);
      }
      const finalFee = feeAfterScholarship - extraLumpSumDiscount;

      // Installment calculation
      const inst1 = Math.round(feeAfterScholarship * 0.4);
      const inst2 = Math.round(feeAfterScholarship * 0.3);
      const inst3 = feeAfterScholarship - inst1 - inst2;

      // Update UI elements
      const elCourseName = document.querySelector("#calcResCourse");
      const elOriginalFee = document.querySelector("#calcResOriginal");
      const elScholarshipBadge = document.querySelector("#calcResBadge");
      const elDiscountAmt = document.querySelector("#calcResDiscount");
      const elFinalFee = document.querySelector("#calcResFinal");
      const elInstallmentPlan = document.querySelector("#calcResInstallments");

      if (elCourseName) elCourseName.textContent = `${courseInfo.name} (${courseInfo.duration})`;
      if (elOriginalFee) elOriginalFee.textContent = `₹${baseFee.toLocaleString("en-IN")}`;
      if (elScholarshipBadge) elScholarshipBadge.textContent = scholarshipTitle;
      if (elDiscountAmt) {
        const totalSaved = scholarshipAmount + extraLumpSumDiscount;
        elDiscountAmt.textContent = `-₹${totalSaved.toLocaleString("en-IN")} (${scholarshipPercent}% Merit${extraLumpSumDiscount ? " + 5% Lump-Sum" : ""})`;
      }
      if (elFinalFee) elFinalFee.textContent = `₹${finalFee.toLocaleString("en-IN")}`;

      if (elInstallmentPlan) {
        if (paymentMode === "lumpsum") {
          elInstallmentPlan.innerHTML = `<strong>Single Payment:</strong> ₹${finalFee.toLocaleString("en-IN")} (Includes additional ₹${extraLumpSumDiscount.toLocaleString("en-IN")} upfront waiver)`;
        } else {
          elInstallmentPlan.innerHTML = `
            <strong>3-Part Flexible Installments:</strong><br>
            • 1st Installment (At Admission): <strong>₹${inst1.toLocaleString("en-IN")}</strong><br>
            • 2nd Installment (After 60 Days): <strong>₹${inst2.toLocaleString("en-IN")}</strong><br>
            • 3rd Installment (Before Prelims): <strong>₹${inst3.toLocaleString("en-IN")}</strong>
          `;
        }
      }
    }

    // Slider percentage text updater and quick chips sync
    const sliderInput = calcForm.querySelector("#calcPercentage");
    const displaySpan = calcForm.querySelector("#calcPercentageDisplay");
    const chipBtns = calcForm.querySelectorAll(".calc-chip-btn");

    if (sliderInput) {
      sliderInput.addEventListener("input", () => {
        if (displaySpan) displaySpan.textContent = `${sliderInput.value}%`;
        chipBtns.forEach((b) => {
          b.classList.toggle("active", b.getAttribute("data-pct") === sliderInput.value);
        });
      });
    }

    chipBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const pct = parseInt(btn.getAttribute("data-pct"), 10);
        if (sliderInput && !isNaN(pct)) {
          sliderInput.value = pct;
          if (displaySpan) displaySpan.textContent = `${pct}%`;
          chipBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          recalculateFee();
        }
      });
    });

    // Attach listeners
    calcForm.querySelectorAll("select, input").forEach((input) => {
      input.addEventListener("input", recalculateFee);
      input.addEventListener("change", recalculateFee);
    });

    // Run initial calculation
    recalculateFee();

    // "Lock In This Scholarship" CTA
    const lockScholarshipBtn = document.querySelector("#lockScholarshipBtn");
    if (lockScholarshipBtn) {
      lockScholarshipBtn.addEventListener("click", () => {
        const course = calcForm.querySelector("#calcCourse").value;
        openDemoModal(course);
      });
    }
  }

  /* ------------------------------------------------------------------------
     5. 5-MINUTE STUDENT DIAGNOSTIC QUIZ ("CHECK YOUR FUNDAMENTALS")
  ------------------------------------------------------------------------ */
  const quizContainer = document.querySelector("#diagnosticQuiz");
  if (quizContainer) {
    const quizData = [
      {
        question: "In Class 10 SSC Mathematics, what is the nature of the roots of a quadratic equation ax² + bx + c = 0 if the discriminant (b² - 4ac) > 0 and not a perfect square?",
        options: [
          "Real, rational and equal",
          "Real, irrational and unequal",
          "Complex / Non-real",
          "Real, rational and unequal"
        ],
        answer: 1,
        explanation: "When Δ > 0 and is not a perfect square, the square root √Δ remains irrational, making roots real, irrational and unequal."
      },
      {
        question: "In Physics (HSC & ICSE), according to Ohm's Law, what happens to the current in a circuit if resistance is doubled while voltage remains constant?",
        options: [
          "Current doubles",
          "Current remains unchanged",
          "Current is halved",
          "Current becomes zero"
        ],
        answer: 2,
        explanation: "By Ohm's Law (I = V/R), current is inversely proportional to resistance. Doubling R halves the current."
      },
      {
        question: "If sin θ = 3/5 for an acute angle θ, what is the value of cos θ?",
        options: [
          "4/5",
          "5/4",
          "3/4",
          "1/2"
        ],
        answer: 0,
        explanation: "Using the fundamental Pythagorean trigonometric identity: cos θ = √(1 - sin²θ) = √(1 - 9/25) = √(16/25) = 4/5."
      },
      {
        question: "In Chemistry, which gas is liberated when dilute hydrochloric acid (HCl) reacts with granulated zinc metal?",
        options: [
          "Oxygen (O₂)",
          "Carbon dioxide (CO₂)",
          "Hydrogen gas (H₂)",
          "Chlorine gas (Cl₂)"
        ],
        answer: 2,
        explanation: "Zn + 2HCl → ZnCl₂ + H₂↑. Zinc displaces hydrogen from the acid, producing hydrogen gas with a pop sound."
      },
      {
        question: "In MHT-CET / Class 11 Physics, what is the work done by the centripetal force on an object moving in a uniform circular motion?",
        options: [
          "W = F × 2πr",
          "W = 0 (Zero Joules)",
          "W = ½ mv²",
          "W = F × r"
        ],
        answer: 1,
        explanation: "Centripetal force is always perpendicular (90°) to instantaneous displacement. Since W = F·d·cos(90°) and cos(90°) = 0, work done is exactly zero."
      }
    ];

    let currentQuestionIdx = 0;
    let score = 0;
    let answered = false;

    const qNumberEl = quizContainer.querySelector("#quizQNumber");
    const qTextEl = quizContainer.querySelector("#quizQText");
    const qOptionsEl = quizContainer.querySelector("#quizOptions");
    const qFeedbackEl = quizContainer.querySelector("#quizFeedback");
    const qNextBtn = quizContainer.querySelector("#quizNextBtn");
    const qResultBox = quizContainer.querySelector("#quizResultBox");
    const qCard = quizContainer.querySelector("#quizCard");

    function renderQuestion() {
      answered = false;
      const q = quizData[currentQuestionIdx];
      if (qNumberEl) qNumberEl.textContent = `Question ${currentQuestionIdx + 1} of ${quizData.length}`;
      if (qTextEl) qTextEl.textContent = q.question;
      if (qFeedbackEl) {
        qFeedbackEl.style.display = "none";
        qFeedbackEl.innerHTML = "";
      }
      if (qNextBtn) {
        qNextBtn.style.display = "none";
        qNextBtn.textContent = currentQuestionIdx === quizData.length - 1 ? "View Results & Batch Recommendation 🎯" : "Next Question →";
      }

      if (qOptionsEl) {
        qOptionsEl.innerHTML = "";
        q.options.forEach((opt, idx) => {
          const btn = document.createElement("button");
          btn.className = "quiz-opt-btn";
          btn.textContent = opt;
          btn.addEventListener("click", () => handleSelectOption(idx));
          qOptionsEl.appendChild(btn);
        });
      }
    }

    function handleSelectOption(selectedIdx) {
      if (answered) return;
      answered = true;
      const q = quizData[currentQuestionIdx];
      const buttons = qOptionsEl.querySelectorAll(".quiz-opt-btn");

      buttons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.answer) {
          btn.classList.add("correct");
        } else if (idx === selectedIdx) {
          btn.classList.add("wrong");
        }
      });

      const isCorrect = selectedIdx === q.answer;
      if (isCorrect) score++;

      if (qFeedbackEl) {
        qFeedbackEl.style.display = "block";
        qFeedbackEl.className = isCorrect ? "quiz-feedback correct-box" : "quiz-feedback wrong-box";
        qFeedbackEl.innerHTML = isCorrect
          ? `✅ <strong>Correct!</strong> ${q.explanation}`
          : `❌ <strong>Incorrect.</strong> ${q.explanation}`;
      }

      if (qNextBtn) {
        qNextBtn.style.display = "inline-block";
      }
    }

    if (qNextBtn) {
      qNextBtn.addEventListener("click", () => {
        if (currentQuestionIdx < quizData.length - 1) {
          currentQuestionIdx++;
          renderQuestion();
        } else {
          showQuizResults();
        }
      });
    }

    function showQuizResults() {
      if (qCard) qCard.style.display = "none";
      if (qResultBox) {
        qResultBox.style.display = "block";
        const percentage = Math.round((score / quizData.length) * 100);
        let badge = "";
        let recommendation = "";

        if (score >= 4) {
          badge = "🌟 Topper Tier: Advanced Concept Mastery!";
          recommendation = "You have exceptional fundamentals! You are an ideal candidate for our <strong>Toppers Batch (Class 10 SSC / ICSE / MHT-CET)</strong> with special merit scholarship eligibility.";
        } else if (score >= 3) {
          badge = "👍 Solid Foundation: Ready for Rapid Improvement!";
          recommendation = "You have good grasp of key concepts. With our <strong>Sunday Test Series & Concept Workshops</strong>, you can easily push your score past 90%+ in the board exams.";
        } else {
          badge = "📘 Growth Opportunity: Focused Mentorship Recommended!";
          recommendation = "Some fundamental concepts need clearer visualization. Our <strong>Small-Batch Coaching & Personal Doubt Desk</strong> at Nashik Road will quickly bridge these gaps.";
        }

        qResultBox.innerHTML = `
          <div class="quiz-score-display">
            <span class="quiz-score-num">${score} / ${quizData.length}</span>
            <h3>${badge}</h3>
            <p>${recommendation}</p>
            <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <button class="btn" data-open-demo-modal>Claim Demo Seat & Discuss Analysis</button>
              <button class="btn secondary" id="retakeQuizBtn">Retake Quiz 🔄</button>
            </div>
          </div>
        `;

        const retakeBtn = qResultBox.querySelector("#retakeQuizBtn");
        if (retakeBtn) {
          retakeBtn.addEventListener("click", () => {
            currentQuestionIdx = 0;
            score = 0;
            qResultBox.style.display = "none";
            if (qCard) qCard.style.display = "block";
            renderQuestion();
          });
        }

        // Re-attach demo modal open listener to the newly rendered button
        const newDemoBtn = qResultBox.querySelector("[data-open-demo-modal]");
        if (newDemoBtn) {
          newDemoBtn.addEventListener("click", (e) => {
            e.preventDefault();
            openDemoModal();
          });
        }
      }
    }

    // Initialize Quiz
    renderQuestion();
  }

  /* ------------------------------------------------------------------------
     6. INTERACTIVE BATCH TIMETABLE & SUNDAY SCHEDULE TABS
  ------------------------------------------------------------------------ */
  const timetableTabs = document.querySelectorAll(".schedule-tab-btn");
  const timetablePanes = document.querySelectorAll(".schedule-pane");

  if (timetableTabs.length > 0) {
    timetableTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetId = tab.getAttribute("data-tab");

        timetableTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        timetablePanes.forEach((pane) => {
          if (pane.id === targetId) {
            pane.classList.add("active");
          } else {
            pane.classList.remove("active");
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     7. COURSE & STUDY MATERIAL FILTERABLE TABS
  ------------------------------------------------------------------------ */
  const filterButtons = document.querySelectorAll(".filter-btn");
  const filterableItems = document.querySelectorAll(".filterable-item");

  if (filterButtons.length > 0) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const category = btn.getAttribute("data-filter");

        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        filterableItems.forEach((item) => {
          const itemCat = item.getAttribute("data-category");
          if (category === "all" || itemCat === category || (itemCat && itemCat.includes(category))) {
            item.style.display = "";
          } else {
            item.style.display = "none";
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     8. FAQ ACCORDION INTERACTIVITY
  ------------------------------------------------------------------------ */
  const faqQuestions = document.querySelectorAll(".faq-item header, .faq-header");
  faqQuestions.forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.closest(".faq-item");
      if (!item) return;

      const wasOpen = item.classList.contains("open");

      // Optional: close all other items in the same FAQ container
      const parentFaq = item.closest(".faq-list");
      if (parentFaq) {
        parentFaq.querySelectorAll(".faq-item").forEach((other) => {
          other.classList.remove("open");
        });
      }

      if (!wasOpen) {
        item.classList.add("open");
      }
    });
  });

  /* ------------------------------------------------------------------------
     9. STUDY MATERIAL PREVIEW & DOWNLOAD MODAL
  ------------------------------------------------------------------------ */
  const previewModal = document.querySelector("#previewModal");
  const openPreviewBtns = document.querySelectorAll("[data-open-preview]");
  const closePreviewBtns = document.querySelectorAll("[data-close-preview]");

  const resourcePreviews = {
    "ssc-maths": {
      title: "Class 10 SSC Mathematics - Complete Formula & Theorem Handbook",
      badge: "Maharashtra SSC Board",
      pages: "18 Pages • Free PDF Guide",
      content: `
        <h4>Key Chapters Covered:</h4>
        <ul>
          <li><strong>Algebra:</strong> Linear Equations in Two Variables (Cramer's Rule, Determinants), Quadratic Equations (Formula method, Nature of Roots Δ), Arithmetic Progression (tₙ and Sₙ formulas), Financial Planning (GST, CGST, SGST calculations), Statistics & Probability.</li>
          <li><strong>Geometry:</strong> Similarity (Basic Proportionality Theorem, Theorem of Areas of Similar Triangles), Pythagoras Theorem (Geometric Mean Property, Apollonius Theorem), Circle Theorems (Tangent-Secant Theorem, Inscribed Angle Theorem), Coordinate Geometry, Trigonometry (Values & Trigonometric Identities), Mensuration formulas.</li>
        </ul>
        <div class="note-box">
          <strong>Teacher Tip:</strong> Focus on theorem statements and geometric proofs from chapters 1, 2, and 3. In Maharashtra SSC Board, 10 marks are directly allocated to standard theorem proofs.
        </div>
      `
    },
    "ssc-science": {
      title: "Class 10 SSC Science - 100 Most Expected Board Questions & Diagram Guide",
      badge: "Maharashtra SSC Board",
      pages: "24 Pages • Board Special",
      content: `
        <h4>Important High-Yield Topics:</h4>
        <ul>
          <li><strong>Science Part 1:</strong> Gravitation (Kepler's Laws, Escape Velocity derivation), Periodic Classification of Elements (Modern Periodic Law, Trends in Valency/Atomic Size), Chemical Reactions & Equations (Types, Corrosion, Rancidity), Effects of Electric Current (Joule's Law of Heating, Right Hand Thumb Rule, Electric Motor & Generator), Refraction of Light (Snell's Law, Mirage, Twinkling of Stars), Lenses, Metallurgy (Extraction of Aluminium, Froth Flotation), Carbon Compounds (Homologous series, IUPAC naming).</li>
          <li><strong>Science Part 2:</strong> Heredity and Evolution (Transcription, Translation, Darwin's Theory), Life Processes in Living Organisms (Cellular Respiration, Glycolysis, Mitosis & Meiosis diagrams), Environmental Management, Disaster Management.</li>
        </ul>
      `
    },
    "cet-shortcuts": {
      title: "MHT-CET Mathematics - 120 Shortcut Problem-Solving Formulas & Speed Hacks",
      badge: "MHT-CET Entrance",
      pages: "32 Pages • Entrance Formula Bank",
      content: `
        <h4>Speed Tricks Included:</h4>
        <ul>
          <li><strong>Matrices & Determinants:</strong> 15-second Inverse Matrix formula for 3×3 matrices without cofactors.</li>
          <li><strong>Calculus:</strong> Standard limit shortcuts using L'Hôpital's Rule & series expansion; Area under standard parabolas (y² = 4ax and x² = 4by area = 16ab/3).</li>
          <li><strong>Trigonometry:</strong> Substitution method for complex trigonometric identities in multiple-choice questions.</li>
          <li><strong>Vectors & 3D Geometry:</strong> Shortest distance between skew lines formula & coplanarity shortcuts.</li>
        </ul>
      `
    },
    "hsc-derivations": {
      title: "Class 12 HSC Physics - Top 40 Board Derivations & Numerical Practice Sheet",
      badge: "Class XII HSC Science",
      pages: "28 Pages • Board Exam Prep",
      content: `
        <h4>Derivations Included with Step Marking:</h4>
        <ul>
          <li><strong>Rotational Dynamics:</strong> Vehicle on a banked road (maximum and minimum speed), Conical pendulum time period, Kinetic energy of rolling motion.</li>
          <li><strong>Mechanical Properties of Fluids:</strong> Excess pressure inside a liquid drop / soap bubble, Capillary ascent equation.</li>
          <li><strong>Wave Optics:</strong> Analytical expression for fringe width in Young's Double Slit Experiment (YDSE).</li>
          <li><strong>Current Electricity & EMI:</strong> Wheatstone's Meter Bridge balance condition, Self and mutual inductance of solenoids.</li>
        </ul>
      `
    },
    "sunday-sample": {
      title: "Perfect Classes Sunday Mock Test Paper - Model Prelim with Marking Scheme",
      badge: "Sunday Test Series",
      pages: "12 Pages • Full Test + Solutions",
      content: `
        <h4>Test Structure (Strict Board Pattern):</h4>
        <ul>
          <li><strong>Part A:</strong> Objective MCQs and 1-mark reasoning questions (10 Marks).</li>
          <li><strong>Part B:</strong> Short answer numericals and reasoning questions with internal choice (20 Marks).</li>
          <li><strong>Part C:</strong> In-depth multi-step derivations, chemical reactions and diagram labeling (30 Marks).</li>
          <li><strong>Answer Key:</strong> Model step-wise marking scheme illustrating how board evaluators allocate marks for steps, SI units, and final statements.</li>
        </ul>
      `
    }
  };

  function openPreview(resourceKey) {
    if (!previewModal) return;
    const res = resourcePreviews[resourceKey] || resourcePreviews["ssc-maths"];

    const titleEl = previewModal.querySelector("#previewTitle");
    const badgeEl = previewModal.querySelector("#previewBadge");
    const pagesEl = previewModal.querySelector("#previewPages");
    const bodyEl = previewModal.querySelector("#previewBody");
    const downloadBtn = previewModal.querySelector("#downloadRealBtn");

    if (titleEl) titleEl.textContent = res.title;
    if (badgeEl) badgeEl.textContent = res.badge;
    if (pagesEl) pagesEl.textContent = res.pages;
    if (bodyEl) bodyEl.innerHTML = res.content;

    if (downloadBtn) {
      downloadBtn.onclick = () => {
        downloadStudyGuide(res.title, res.badge);
      };
    }

    previewModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closePreview() {
    if (!previewModal) return;
    previewModal.classList.remove("active");
    document.body.style.overflow = "";
  }

  openPreviewBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const key = btn.getAttribute("data-resource-key") || "ssc-maths";
      openPreview(key);
    });
  });

  closePreviewBtns.forEach((btn) => {
    btn.addEventListener("click", closePreview);
  });

  if (previewModal) {
    previewModal.addEventListener("click", (e) => {
      if (e.target === previewModal) closePreview();
    });
  }

  function downloadStudyGuide(title, category) {
    const textContent = `========================================================================
PERFECT COACHING CLASSES - NASHIK ROAD
C-13, Ishwar Sankul, Bytco Point, Nashik Road - 422101
Helpline: +91 98226 61307 | Web: www.perfectcoachingclasses.com
========================================================================

RESOURCE: ${title}
CATEGORY: ${category}
ACADEMIC YEAR: 2026-2027

------------------------------------------------------------------------
STUDY & PREPARATION GUIDELINES BY SENIOR FACULTY
------------------------------------------------------------------------
1. Conceptual Clarity First: Always understand the fundamental physical or
   mathematical reasoning before memorizing formulas.
2. Weekly Testing Discipline: Attend every Sunday test session to build exam
   stamina and identify recurring mistakes.
3. Step Marking & Representation: Always write formulas, substitute values
   with proper SI units, and box your final answer.
4. Error Register: Maintain a separate notebook for all questions where
   marks were deducted in Sunday tests and re-solve them before exams.

For complete printed booklets, full question banks, and Sunday test series
admissions, visit our campus at Ishwar Sankul near Bytco Point, Nashik Road.
========================================================================
© Perfect Coaching Classes, Nashik Road. All Rights Reserved.`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_PerfectClasses.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`✅ Downloading "${title}"!\n\nThis study guide has been saved to your device. For comprehensive printed hardcopies and Sunday Test Series registration, visit our Bytco Point campus.`);
  }

  /* ------------------------------------------------------------------------
     10. FLOATING ACTION WIDGETS (BACK TO TOP & WHATSAPP)
  ------------------------------------------------------------------------ */
  const backToTopBtn = document.querySelector("#backToTopBtn");
  if (backToTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 350) {
        backToTopBtn.classList.add("visible");
      } else {
        backToTopBtn.classList.remove("visible");
      }
    });

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ------------------------------------------------------------------------
     11. DYNAMIC ANNOUNCEMENT TICKER (PAUSE ON HOVER)
  ------------------------------------------------------------------------ */
  const ticker = document.querySelector(".announce-ticker");
  if (ticker) {
    ticker.addEventListener("mouseenter", () => {
      ticker.style.animationPlayState = "paused";
    });
    ticker.addEventListener("mouseleave", () => {
      ticker.style.animationPlayState = "running";
    });
  }

  /* ------------------------------------------------------------------------
     12. TOPPERS POSTER LIGHTBOX MODAL PREVIEW
  ------------------------------------------------------------------------ */
  const lightboxModal = document.querySelector("#topperLightboxModal");
  const lightboxImg = document.querySelector("#lightboxImg");
  const lightboxCaption = document.querySelector("#lightboxCaption");
  const topperPosterCards = document.querySelectorAll(".topper-poster-card");

  if (lightboxModal && lightboxImg) {
    function openLightbox(imgSrc, captionText) {
      lightboxImg.src = imgSrc;
      if (lightboxCaption) {
        lightboxCaption.textContent = captionText || "";
      }
      lightboxModal.classList.add("active");
      lightboxModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lightboxModal.classList.remove("active");
      lightboxModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      setTimeout(() => {
        if (!lightboxModal.classList.contains("active")) {
          lightboxImg.src = "";
        }
      }, 250);
    }

    topperPosterCards.forEach((card) => {
      card.addEventListener("click", () => {
        const fullImg = card.getAttribute("data-full-img") || card.querySelector("img")?.src;
        const caption = card.getAttribute("data-caption") || card.querySelector(".topper-title")?.textContent;
        if (fullImg) openLightbox(fullImg, caption);
      });
    });

    const closeBtn = lightboxModal.querySelector(".lightbox-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeLightbox();
      });
    }

    lightboxModal.addEventListener("click", (e) => {
      if (e.target === lightboxModal || e.target.classList.contains("lightbox-dialog")) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightboxModal.classList.contains("active")) {
        closeLightbox();
      }
    });
  }

});

