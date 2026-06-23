let currentStep = 1;
const totalSteps = 5;
let childrenCount = 0;

// wire up file uploads and basic UI states as soon as the DOM finishes loading
$(document).ready(function () {
    // convert file inputs to base64 strings so they can be sent as JSON and stored directly in sqlite
    setupPhotoUpload('main_photo', 'main_photo_preview', 'main_photo_data');
    setupPhotoUpload('wife_photo', 'wife_photo_preview', 'wife_photo_data');
    setupPhotoUpload('father_photo', 'father_photo_preview', 'father_photo_data');
    setupPhotoUpload('mother_photo', 'mother_photo_preview', 'mother_photo_data');

    // intercept form submission and route it through our own ajax handler instead of reloading
    $('#membershipForm').on('submit', function (e) {
        e.preventDefault();
        submitApplicationForm();
    });

    // draw the first step of the progress indicator
    updateProgressBar();
});

// standard FileReader logic to load image, make sure it is under 2MB, and base64-encode it
function setupPhotoUpload(inputId, previewId, dataHiddenId) {
    $(`#${inputId}`).on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // 2MB ceiling. anything larger will bloat the SQLite db pretty fast.
        if (file.size > 2 * 1024 * 1024) {
            alert("Oops! That image is too large. Please upload a photo smaller than 2MB.");
            this.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (event) {
            const base64String = event.target.result;
            $(`#${dataHiddenId}`).val(base64String);
            $(`#${previewId}`).html(`<img src="${base64String}" alt="Preview">`);
        };
        reader.readAsDataURL(file);
    });
}

// select between individual or family options. switches tabs and handles initial child rows.
function selectMembershipType(type) {
    $('input[name="membership_type"]').prop('checked', false);
    $(`#type${type.charAt(0).toUpperCase() + type.slice(1)}`).prop('checked', true);
    
    $('.type-card').removeClass('selected');
    $(`#type${type.charAt(0).toUpperCase() + type.slice(1)}`).closest('.type-card').addClass('selected');

    if (type === 'family') {
        $('#family-fields').show();
        $('#individual-info-alert').hide();
        // add one child row by default to guide the user visually
        if (childrenCount === 0) {
            addChildRow();
        }
    } else {
        $('#family-fields').hide();
        $('#individual-info-alert').show();
    }
}

// append a new dynamic row inside the children form section
function addChildRow() {
    childrenCount++;
    const childHtml = `
        <div class="child-row" id="child_row_${childrenCount}">
            <div class="form-group">
                <label>Child Name <span class="guj-input-label">(નામ)</span></label>
                <input type="text" name="child_name_${childrenCount}" placeholder="Full Name" required>
            </div>
            <div class="form-group">
                <label>Relation <span class="guj-input-label">(સંબંધ)</span></label>
                <select name="child_relation_${childrenCount}" required>
                    <option value="Son">Son (પુત્ર)</option>
                    <option value="Daughter">Daughter (પુત્રી)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Age or DOB <span class="guj-input-label">(જન્મતારીખ)</span></label>
                <input type="text" name="child_dob_${childrenCount}" placeholder="e.g. 12 Years / DD-MM-YYYY" required>
            </div>
            <div>
                <button type="button" class="btn-remove-row" onclick="removeChildRow(${childrenCount})">🗑️</button>
            </div>
        </div>
    `;
    $('#children-container').append(childHtml);
}

// remove child row from DOM
function removeChildRow(id) {
    $(`#child_row_${id}`).remove();
}

// step switcher navigation with step validation checks
function navigateStep(direction) {
    if (direction === 1 && !validateCurrentStep()) {
        return; // stop if validation fails
    }

    // dismiss the active view
    $(`.form-step[data-step="${currentStep}"]`).removeClass('active');
    
    // increment/decrement step with bounds protection
    currentStep += direction;
    if (currentStep < 1) currentStep = 1;
    if (currentStep > totalSteps) currentStep = totalSteps;

    // reveal the new target view
    $(`.form-step[data-step="${currentStep}"]`).addClass('active');

    // sync wizard steps, nav buttons, and progress line
    updateProgressBar();
    updateWizardButtons();

    // build the review screen if they reach step 5
    if (currentStep === 5) {
        renderReviewSummary();
    }

    // scroll up smoothly to the top of the form layout
    $('html, body').animate({
        scrollTop: $('.wizard-container').offset().top - 100
    }, 400);
}

// show or hide prev/next/submit CTA controls based on which step they are viewing
function updateWizardButtons() {
    if (currentStep === 1) {
        $('#prevBtn').hide();
        $('#nextBtn').show();
        $('#submitBtn').hide();
    } else if (currentStep === totalSteps) {
        $('#prevBtn').show();
        $('#nextBtn').hide();
        $('#submitBtn').show();
    } else {
        $('#prevBtn').show();
        $('#nextBtn').show();
        $('#submitBtn').hide();
    }
}

// update the wizard step nodes visually and adjust the connecting line width
function updateProgressBar() {
    const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
    $('#progress-bar').css('width', progressPercent + '%');

    $('.step-node').each(function () {
        const stepNum = parseInt($(this).attr('data-step'));
        if (stepNum < currentStep) {
            $(this).addClass('completed').removeClass('active');
        } else if (stepNum === currentStep) {
            $(this).addClass('active').removeClass('completed');
        } else {
            $(this).removeClass('active completed');
        }
    });
}

// checks inputs in the current wizard view before letting them proceed
function validateCurrentStep() {
    let isValid = true;
    const currentStepContainer = $(`.form-step[data-step="${currentStep}"]`);
    
    // find all required inputs in the current slide container
    const inputs = currentStepContainer.find('input[required], textarea[required], select[required]');
    
    inputs.each(function () {
        $(this).css('border-color', ''); // clear previous validation styles
        
        if (!this.value || this.value.trim() === '') {
            $(this).css('border-color', 'red');
            isValid = false;
        }

        // quick regex validation for email inputs
        if ($(this).attr('type') === 'email' && this.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.value)) {
                $(this).css('border-color', 'red');
                isValid = false;
            }
        }

        // verify user checked required checkboxes (like terms)
        if ($(this).attr('type') === 'checkbox' && !$(this).is(':checked')) {
            $(this).parent().css('color', 'red');
            isValid = false;
        } else if ($(this).attr('type') === 'checkbox') {
            $(this).parent().css('color', '');
        }

        // primary applicant age restriction validation (21+)
        if (this.id === 'main_age' && this.value) {
            const ageVal = parseInt(this.value);
            if (ageVal < 21) {
                alert("Under our community constitution, the primary applicant must be 21 years of age or older to join.");
                $(this).css('border-color', 'red');
                isValid = false;
            }
        }
    });

    if (!isValid) {
        alert("Looks like a few details are missing! Please fill in all the required fields (*) to move to the next step.");
    }
    return isValid;
}

// serialize all form input values into a JSON object matching app.py expectations
function getFormData() {
    const memType = $('input[name="membership_type"]:checked').val();
    const isFamily = memType === 'family';

    const data = {
        membership_type: memType,
        main_member: {
            name: $('#main_name').val(),
            age: $('#main_age').val(),
            photo: $('#main_photo_data').val()
        },
        family: null,
        address_india: {
            address: $('#india_address').val(),
            phone: $('#india_phone').val()
        },
        contact_kuwait: {
            mobile: $('#kuwait_mobile').val(),
            home: $('#kuwait_home').val() || "N/A",
            office: $('#kuwait_office').val() || "N/A"
        },
        emails: {
            primary: $('#email_primary').val(),
            secondary: $('#email_secondary').val() || "N/A"
        },
        declaration: {
            years_in_gujarat: $('#years_in_gujarat').val(),
            origin_confirm: $('#decl_origin').is(':checked'),
            constitution_confirm: $('#decl_constitution').is(':checked')
        },
        recommenders: {
            rec1_name: $('#rec1_name').val(),
            rec1_id: $('#rec1_id').val(),
            rec2_name: $('#rec2_name').val(),
            rec2_id: $('#rec2_id').val()
        },
        submission_date: new Date().toLocaleDateString()
    };

    if (isFamily) {
        data.family = {
            wife: {
                name: $('#wife_name').val() || "N/A",
                age: $('#wife_age').val() || "N/A",
                photo: $('#wife_photo_data').val() || null
            },
            father: {
                name: $('#father_name').val() || "N/A",
                age: $('#father_age').val() || "N/A",
                photo: $('#father_photo_data').val() || null
            },
            mother: {
                name: $('#mother_name').val() || "N/A",
                age: $('#mother_age').val() || "N/A",
                photo: $('#mother_photo_data').val() || null
            },
            children: []
        };

        // push dynamic children rows into the payload array
        $('#children-container .child-row').each(function () {
            const inputs = $(this).find('input, select');
            data.family.children.push({
                name: inputs.eq(0).val(),
                relation: inputs.eq(1).val(),
                dob: inputs.eq(2).val()
            });
        });
    }

    return data;
}

// builds review summary layout so the user can verify details before submission
function renderReviewSummary() {
    const data = getFormData();
    const isFamily = data.membership_type === 'family';

    let html = `
        <div class="review-grid">
            <div class="review-item"><strong>Membership Type:</strong> ${data.membership_type.toUpperCase()}</div>
            <div class="review-item"><strong>Date:</strong> ${data.submission_date}</div>
            
            <div class="review-item" style="grid-column: span 2;">
                <h4 style="margin-top:0.5rem; color:var(--primary-color);">Primary Applicant Details</h4>
                <div><strong>Name:</strong> ${data.main_member.name}</div>
                <div><strong>Age:</strong> ${data.main_member.age}</div>
            </div>
    `;

    if (isFamily) {
        html += `
            <div class="review-item" style="grid-column: span 2;">
                <h4 style="margin-top:0.5rem; color:var(--primary-color);">Family & Dependents</h4>
                <div><strong>Spouse (Wife):</strong> ${data.family.wife.name} (Age: ${data.family.wife.age})</div>
                <div><strong>Father:</strong> ${data.family.father.name} (Age: ${data.family.father.age})</div>
                <div><strong>Mother:</strong> ${data.family.mother.name} (Age: ${data.family.mother.age})</div>
            </div>
            <div class="review-item" style="grid-column: span 2;">
                <strong>Children Registered:</strong> ${data.family.children.length === 0 ? "None" : ""}
                <ul style="padding-left:1.5rem; list-style:disc; margin-top:0.3rem;">
        `;
        data.family.children.forEach(child => {
            html += `<li>${child.name} - ${child.relation} (Age/DOB: ${child.dob})</li>`;
        });
        html += `</ul></div>`;
    }

    html += `
            <div class="review-item" style="grid-column: span 2;">
                <h4 style="margin-top:0.5rem; color:var(--primary-color);">Address & Contact Details</h4>
                <div><strong>India Address:</strong> ${data.address_india.address} (Phone: ${data.address_india.phone})</div>
                <div><strong>Kuwait Contact:</strong> Mobile: ${data.contact_kuwait.mobile} | Home: ${data.contact_kuwait.home} | Office: ${data.contact_kuwait.office}</div>
                <div><strong>Emails:</strong> Primary: ${data.emails.primary} | Secondary: ${data.emails.secondary}</div>
            </div>
            
            <div class="review-item" style="grid-column: span 2;">
                <h4 style="margin-top:0.5rem; color:var(--primary-color);">Declarations</h4>
                <div><strong>Years Resided in Gujarat:</strong> ${data.declaration.years_in_gujarat} Years</div>
                <div><strong>Birth/Constitution Agreements:</strong> Accepted (આવેદન પત્ર મંજૂર)</div>
            </div>

            <div class="review-item" style="grid-column: span 2;">
                <h4 style="margin-top:0.5rem; color:var(--primary-color);">Recommendations</h4>
                <div><strong>1. Recommender Name:</strong> ${data.recommenders.rec1_name} (ID: ${data.recommenders.rec1_id})</div>
                <div><strong>2. Recommender Name:</strong> ${data.recommenders.rec2_name} (ID: ${data.recommenders.rec2_id})</div>
            </div>
        </div>
    `;

    $('#form-review-container').html(html);
}

// final submission logic: hits the Flask API endpoint, falls back to localStorage if offline
function submitApplicationForm() {
    if (!$('#signature_confirm').is(':checked')) {
        alert("Please check the verification declaration box at the bottom to sign and complete your application.");
        return;
    }

    const applicationData = getFormData();
    
    // generate a unique ID and initial status for this application
    applicationData.id = "APP_" + Date.now();
    applicationData.status = "Pending";

    // hit Flask backend first, fallback to local storage if server is down
    fetch('/api/applications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(applicationData)
    })
    .then(response => {
        if (response.ok) {
            console.log("Submitted successfully to API.");
            showSuccess(applicationData);
        } else {
            throw new Error("API Offline");
        }
    })
    .catch(error => {
        console.warn("Backend API not detected, saving to localStorage as fallback.");
        let applications = JSON.parse(localStorage.getItem('samarpan_applications') || '[]');
        applications.push(applicationData);
        localStorage.setItem('samarpan_applications', JSON.stringify(applications));
        showSuccess(applicationData);
    });
}

// triggers success popup modal and builds printable layout in the background
function showSuccess(data) {
    $('#successOverlay').css('display', 'flex');
    buildPrintableForm(data);
}

// constructs a print layout matching the exact design of the physical PDF application form
function buildPrintableForm(data) {
    const isFamily = data.membership_type === 'family';
    
    let childrenTableRows = '';
    const childrenLength = isFamily ? data.family.children.length : 0;
    
    for (let i = 0; i < Math.max(3, childrenLength); i++) {
        const child = (isFamily && data.family.children[i]) ? data.family.children[i] : { name: '', relation: '', dob: '' };
        childrenTableRows += `
            <tr style="height:35px;">
                <td style="border: 1px solid black; padding: 5px; text-align:center;">${i + 1}</td>
                <td style="border: 1px solid black; padding: 5px;">${child.name}</td>
                <td style="border: 1px solid black; padding: 5px; text-align:center;">${child.relation}</td>
                <td style="border: 1px solid black; padding: 5px; text-align:center;">${child.dob}</td>
            </tr>
        `;
    }

    const mainPhotoHtml = data.main_member.photo ? `<img src="${data.main_member.photo}" style="width:100%; height:100%; object-fit:cover;">` : 'PHOTO';
    
    let familyPhotosHtml = '';
    if (isFamily) {
        if (data.family.wife.photo) familyPhotosHtml += `<div style="width:80px; height:90px; border:1px solid black; display:inline-block; margin-right:5px; text-align:center; line-height:90px; font-size:10px;"><img src="${data.family.wife.photo}" style="width:100%; height:100%; object-fit:cover;"></div>`;
        if (data.family.father.photo) familyPhotosHtml += `<div style="width:80px; height:90px; border:1px solid black; display:inline-block; margin-right:5px; text-align:center; line-height:90px; font-size:10px;"><img src="${data.family.father.photo}" style="width:100%; height:100%; object-fit:cover;"></div>`;
        if (data.family.mother.photo) familyPhotosHtml += `<div style="width:80px; height:90px; border:1px solid black; display:inline-block; text-align:center; line-height:90px; font-size:10px;"><img src="${data.family.mother.photo}" style="width:100%; height:100%; object-fit:cover;"></div>`;
    }
    if (familyPhotosHtml === '') {
        familyPhotosHtml = '<div style="font-size:11px; color:#555;">No other family photos uploaded.</div>';
    }

    const html = `
        <div style="border: 4px double black; padding: 30px; font-family: 'Arial', sans-serif; position: relative;">
            
            <!-- Photo Box (Absolute Top Right) -->
            <div style="position: absolute; top: 30px; right: 30px; width: 110px; height: 130px; border: 1px solid black; text-align: center; font-size:11px;">
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
                    ${mainPhotoHtml}
                </div>
            </div>

            <!-- Header -->
            <div style="text-align: center; margin-bottom: 25px; padding-right:120px;">
                <h1 style="font-size: 26px; margin: 0; font-weight: bold; letter-spacing:1px;">સમર્પણ</h1>
                <h2 style="font-size: 16px; margin: 5px 0 0 0; text-decoration: underline; font-weight: bold;">સભ્યપદ માટેનું આવેદન પત્ર</h2>
                <div style="font-size: 11px; margin-top:5px; color:#333;">Under the Aegis of Indian Embassy, Kuwait</div>
            </div>

            <!-- Part A: Membership Type -->
            <div style="margin-bottom: 15px; font-size: 13px;">
                <strong>(ક) સભ્યપદ નો પ્રકાર:</strong> &nbsp;&nbsp;
                <span style="font-size: 16px;">
                    ${data.membership_type === 'individual' ? '☑ व्यक्तिगत सभ્યપદ (Individual)' : '☐ व्यक्तिगत સભ્યપદ (Individual)'}
                </span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <span style="font-size: 16px;">
                    ${data.membership_type === 'family' ? '☑ કૌટુંબિક સભ્યપદ (Family)' : '☐ કૌટુંબિક સભ્યપદ (Family)'}
                </span>
            </div>

            <!-- Part B: Main Details Table -->
            <div style="margin-bottom: 15px;">
                <strong>(ખ) સભ્યપદ મેળવવા ઇચ્છતી વ્યક્તિની વિગતો (૨૧ વર્ષ ઉપરની):</strong>
                <table style="width:100%; border-collapse: collapse; margin-top: 5px; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #f2f2f2; height:30px;">
                            <th style="border: 1px solid black; padding: 5px; width:5%; text-align:center;">ક્રમ</th>
                            <th style="border: 1px solid black; padding: 5px; width:35%;">નામ (Name)</th>
                            <th style="border: 1px solid black; padding: 5px; width:20%; text-align:center;">સંબંધ (Relation)</th>
                            <th style="border: 1px solid black; padding: 5px; width:20%; text-align:center;">ઉંમર (Age)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="height:30px;">
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">૧</td>
                            <td style="border: 1px solid black; padding: 5px; font-weight:bold;">${data.main_member.name}</td>
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">મુખ્ય વ્યક્તિ (Main)</td>
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">${data.main_member.age}</td>
                        </tr>
                        <tr style="height:30px;">
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">૨</td>
                            <td style="border: 1px solid black; padding: 5px;">${isFamily ? data.family.wife.name : ''}</td>
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">પત્ની (Wife)</td>
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">${isFamily ? data.family.wife.age : ''}</td>
                        </tr>
                        <tr style="height:30px;">
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">૩</td>
                            <td style="border: 1px solid black; padding: 5px;">${isFamily ? data.family.father.name : ''}</td>
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">પિતા (Father)</td>
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">${isFamily ? data.family.father.age : ''}</td>
                        </tr>
                        <tr style="height:30px;">
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">૪</td>
                            <td style="border: 1px solid black; padding: 5px;">${isFamily ? data.family.mother.name : ''}</td>
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">માતા (Mother)</td>
                            <td style="border: 1px solid black; padding: 5px; text-align:center;">${isFamily ? data.family.mother.age : ''}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Children details -->
            <div style="margin-bottom: 15px;">
                <strong>બાળકો - મુખ્ય વ્યક્તિ પર નિર્ભર અને કુવૈત માં સાથે રહેતા હોય તેવા (૨૧ વર્ષ ની નીચેના):</strong>
                <table style="width:100%; border-collapse: collapse; margin-top: 5px; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #f2f2f2; height:30px;">
                            <th style="border: 1px solid black; padding: 5px; width:5%; text-align:center;">ક્રમ</th>
                            <th style="border: 1px solid black; padding: 5px; width:45%;">નામ (Name)</th>
                            <th style="border: 1px solid black; padding: 5px; width:20%; text-align:center;">સંબંધ (Relation)</th>
                            <th style="border: 1px solid black; padding: 5px; width:30%; text-align:center;">ઉંમર/જન્મતારીખ (Age/DOB)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${childrenTableRows}
                    </tbody>
                </table>
            </div>

            <!-- Address and Contacts -->
            <div style="margin-bottom: 15px; font-size: 13px; line-height: 1.5;">
                <div><strong>(ગ) ગુજરાત/ભારત - પત્રવ્યવહાર નું સરનામું / ફોન:</strong></div>
                <div style="border: 1px solid black; padding: 8px; min-height: 45px; margin-top: 2px;">
                    ${data.address_india.address} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>ફોન:</strong> ${data.address_india.phone}
                </div>
            </div>

            <div style="margin-bottom: 15px; font-size: 13px;">
                <strong>(ઘ) કુવૈત ટેલીફોન:</strong> &nbsp;&nbsp;
                <strong>ઘર (Home):</strong> ${data.contact_kuwait.home} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>ઓફિસ (Office):</strong> ${data.contact_kuwait.office} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <strong>મોબાઇલ (Mobile):</strong> ${data.contact_kuwait.mobile}
            </div>

            <div style="margin-bottom: 15px; font-size: 13px;">
                <strong>(ચ) ઈ-મેલ:</strong> &nbsp;&nbsp;
                (૧) ${data.emails.primary} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                (૨) ${data.emails.secondary}
            </div>

            <!-- Declarations -->
            <div style="margin-bottom: 20px; font-size: 12.5px; line-height: 1.5; border-top:1px dashed #ccc; padding-top:10px;">
                <div>☑ <strong>(છ)</strong> અમો જન્મ જાત ગુજરાતી છીએ (We are Gujarati by birth).</div>
                <div>☑ <strong>(જ)</strong> અમો છેલ્લા <strong style="text-decoration: underline;">&nbsp;&nbsp;${data.declaration.years_in_gujarat}&nbsp;&nbsp;</strong> વર્ષો થી ગુજરાત માં રહીએ છીએ.</div>
                <div>☑ <strong>(ઝ)</strong> અમો "સમર્પણ" નું બંધારણ માન્ય રાખી સભ્ય થવા ઇચ્છીએ છીએ (We accept the Constitution of Samarpan).</div>
            </div>

            <!-- Date and Signature -->
            <div style="margin-bottom: 25px; font-size: 13px; display:flex; justify-content:space-between; margin-top: 15px;">
                <div><strong>તારીખ (Date):</strong> ${data.submission_date}</div>
                <div style="text-align: right; width: 300px;">
                    <strong>ખરાઈ સહી (Signature):</strong> <span style="font-family:'Courier New', monospace; font-weight:bold; border-bottom:1px solid black; padding:0 10px;">/s/ ${data.main_member.name}</span>
                </div>
            </div>

            <!-- Recommenders -->
            <div style="border: 1px solid black; padding: 12px; margin-bottom: 20px; font-size:12px; line-height: 1.5;">
                <div style="font-weight: bold; text-align: center; margin-bottom: 5px; text-decoration: underline;">
                    સમર્પણ ના - બે કે તેથી વધુ વર્ષો થી સભ્યપદ ધરાવનાર - બે સભ્યો ની ભલામણ (અનિવાર્ય)
                </div>
                <div>(૧) સભ્ય નું નામ: <strong style="border-bottom:1px solid #555; padding-right:150px;">${data.recommenders.rec1_name}</strong> સહી / ID: <strong>${data.recommenders.rec1_id}</strong></div>
                <div style="margin-top: 5px;">(૨) સભ્ય નું નામ: <strong style="border-bottom:1px solid #555; padding-right:150px;">${data.recommenders.rec2_name}</strong> સહી / ID: <strong>${data.recommenders.rec2_id}</strong></div>
            </div>

            <!-- Family Photos (Hidden in original paper form, but printed at the bottom of the page for admin reference) -->
            <div style="margin-top: 20px; border-top: 1px solid black; padding-top:10px;" class="no-print-layout">
                <strong>બીજા સભ્યોના ફોટોગ્રાફ્સ:</strong>
                <div style="margin-top: 8px;">
                    ${familyPhotosHtml}
                </div>
            </div>

            <!-- Footer Committee Use -->
            <div style="border: 2px dashed black; padding: 15px; margin-top: 30px; font-size:11.5px; background-color:#fafafa;">
                <div style="font-weight: bold; text-align: center; margin-bottom: 5px;">કારોબારી સમિતિ માટે (For Committee Use Only)</div>
                <div style="display:flex; justify-content:space-between;">
                    <div>સભ્ય ફી પેટે કુલ દીનાર: .......................</div>
                    <div>વર્ષ: .......................</div>
                    <div>તારીખ: .......................</div>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:10px;">
                    <div>લવાજમ લેનાર ની સહી: .......................</div>
                    <div>ખજાનચી: .......................</div>
                    <div>સભ્યપદ: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ માન્ય (Approved) &nbsp;&nbsp;&nbsp;&nbsp; ☐ અમાન્ય (Rejected)</div>
                </div>
            </div>

        </div>
    `;

    $('#printable-application').html(html);
}

// open the browser print dialog
function printApplication() {
    window.print();
}
