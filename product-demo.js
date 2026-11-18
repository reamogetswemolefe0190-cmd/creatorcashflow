const state = {
            page: 'landing',
            step: 0,
            activeWorkspaceTab: 'Overview',
            chatMessages: {
                creator: [
                    { sender: 'Studio North (Nadia)', time: '10:24 AM', text: 'Hey Thando! The brand approved the outdoor movement concept. Please keep the opening shot natural and feature the bottle in the first 3 seconds.', incoming: true },
                    { sender: 'Thando Mokoena', time: '10:45 AM', text: 'Thanks Nadia! Filming tomorrow morning at Camps Bay. Will upload the draft link by Monday 16 Sep.', incoming: false },
                    { sender: 'Studio North (Nadia)', time: '11:02 AM', text: 'Perfect! Once uploaded, our team will run a quick QC before handing over to Vela Active for publishing approval.', incoming: true }
                ],
                agency: [
                    { sender: 'Vela Active (Sarah)', time: '09:15 AM', text: 'Good morning Studio North team. Budget allocation for Spring in motion is locked at R60,000. Looking forward to reviewing Thando and Naledi’s drafts.', incoming: true },
                    { sender: 'Studio North Lead', time: '09:30 AM', text: 'Thanks Sarah. Thando’s video is filming tomorrow and Naledi’s stories are already drafted. Will push for your sign-off by 18 Sep.', incoming: false }
                ],
                brand: [
                    { sender: 'Studio North (Lead)', time: '09:30 AM', text: 'Hi Sarah, 8 of the 12 deliverables have been checked and approved by our team. Thando’s video is scheduled next.', incoming: true },
                    { sender: 'Vela Active Brand', time: '09:48 AM', text: 'Great progress. Please ensure the link clicks are tracked with the #CCF-024 campaign UTMs.', incoming: false }
                ]
            }
        };

        const stages = [
            [
                'Agency',
                'Create the brief',
                'Define the scope, deliverables, usage rights and deadline in one place.',
                'Save campaign brief',
                'The agency can now assign a creator and invite a brand reviewer.',
                'Campaign brief · Spring in motion'
            ],
            [
                'Agency',
                'Build the creator team',
                'Match the brief to a creator and set out the assignment.',
                'Assign a creator',
                'Creator sees the scope and due date in their workspace.',
                'Thando Mokoena · first video'
            ],
            [
                'Creator',
                'Accept and create',
                'Accept the assignment, then share the first draft link for review.',
                'Submit deliverable',
                'Agency receives the draft and creator notes.',
                '1 video · 3 stories'
            ],
            [
                'Agency',
                'Review the content',
                'Check the work against the brief before sending it to the brand.',
                'Send to brand',
                'Brand receives the checked version for final approval.',
                'Version 1 · ready for review'
            ],
            [
                'Brand',
                'Approve for publishing',
                'Approve the agency-reviewed content or request a revision in the same record.',
                'Approve deliverable',
                'Creator can add the published post link.',
                'Approved · publish 18 Sep'
            ],
            [
                'Creator',
                'Publish and record results',
                'Add the live post link. Campaign results can be recorded manually and labelled as such.',
                'Add published link',
                'Agency and brand can see the published work and labelled results.',
                'Published link · manual results'
            ]
        ];

        function getPhotoHtml(key) {
            const template = document.getElementById('cc-photo-assets');
            if (!template) return '';
            const img = template.content.querySelector('[data-stock="' + key + '"]');
            return img ? img.outerHTML : '';
        }

        function setPage(pageName, updateHash = true) {
            state.page = pageName;
            
            // Sync Floating Dock Active State
            document.querySelectorAll('.cc-dock-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.dockPage === pageName);
            });

            if (updateHash) {
                window.location.hash = pageName;
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
            render();
        }

        function setStep(stepIndex) {
            state.step = stepIndex;
            render();
        }

        function nextStep() {
            state.step = (state.step + 1) % 6;
            render();
        }

        function setWorkspaceTab(tabName) {
            state.activeWorkspaceTab = tabName;
            render();
        }

        function openCampaignFlow(currentRole) {
            if (currentRole === 'creator') state.step = 2; // Accept and create
            else if (currentRole === 'agency') state.step = 3; // Review the content
            else if (currentRole === 'brand') state.step = 4; // Approve for publishing
            setPage('journey');
        }

        function openTourDock() {
            const dock = document.getElementById('cc-tour-dock');
            if (dock) {
                dock.scrollIntoView({ behavior: 'smooth' });
                dock.style.boxShadow = '0 0 0 3px #D4F973, 0 20px 48px rgba(0,0,0,0.8)';
                setTimeout(() => {
                    dock.style.boxShadow = '';
                }, 1200);
            }
        }

        function renderRow(title, sub, tag, tagClass = '') {
            return `
                <div class="cc-row">
                    <div>
                        <strong>${title}</strong>
                        <span class="cc-small">${sub}</span>
                    </div>
                    <span class="cc-tag ${tagClass}">${tag}</span>
                </div>
            `;
        }

        function sendChatMessage(role) {
            const input = document.getElementById('chat-input-field');
            if (!input || !input.value.trim()) return;

            const text = input.value.trim();
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const myName = role === 'creator' ? 'Thando Mokoena' : role === 'agency' ? 'Studio North Lead' : 'Vela Active Brand';

            state.chatMessages[role].push({
                sender: myName,
                time: timeStr,
                text: text,
                incoming: false
            });

            input.value = '';
            render();
        }

        function approveBrandDeliverable(creatorName) {
            alert('Deliverable for ' + creatorName + ' successfully approved! Publishing schedule confirmed for 18 Sep.');
            render();
        }

        function downloadInvoiceProof(invNumber) {
            alert('Downloading certified PDF receipt for ' + invNumber + ' (POPIA-compliant SARS sole-proprietor record).');
        }

        function render() {
            const viewport = document.getElementById('cc-screen');
            if (!viewport) return;

            if (state.page === 'landing') {
                if(window.CCFLanding){
                    viewport.innerHTML = window.CCFLanding();
                    document.body.classList.add('ccf-marketing');
                }
            } else if (state.page === 'login') {
                document.body.classList.remove('ccf-marketing');
                viewport.innerHTML = `
                    <div class="cc-login">
                        <div class="cc-login-art">
                            ${getPhotoHtml('creator')}
                            <div>
                                <div class="cc-kicker" style="color: var(--cc-accent);">A little less admin</div>
                                <h2>Your next chapter<br>starts here.</h2>
                                <p>One account. The right workspace.<br>Every collaboration connected.</p>
                            </div>
                            <div class="cc-row" style="border: 0; padding: 0;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span class="cc-avatar" style="color: var(--cc-accent);">TM</span>
                                    <span>Thando’s workspace</span>
                                </div>
                                <span class="cc-tag">Creator ↗</span>
                            </div>
                        </div>

                        <div class="cc-login-form">
                            <div class="cc-kicker">Welcome back</div>
                            <h2>Let’s get to work.</h2>
                            <p class="cc-small">Select a demo persona. This is not an account sign-in.</p>

                            <label class="cc-field">
                                Workspace Role
                                <select id="demo-role-select" data-demo-role="true">
                                    <option value="creator">Creator · Thando Mokoena</option>
                                    <option value="agency">Agency · Studio North</option>
                                    <option value="brand">Brand · Vela Active</option>
                                </select>
                            </label>

                            <label class="cc-field">
                                Email address
                                <input type="email" id="demo-email-input" value="thando@example.com" autocomplete="off">
                            </label>

                            <label class="cc-field">
                                Password
                                <input type="password" value="••••••••••••" placeholder="Enter your password" autocomplete="off">
                            </label>

                            <button class="cc-btn cc-primary" style="width: 100%; margin-top: 10px;" data-command="executeDemoLogin()">
                                Enter demo workspace <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; vertical-align: -2px; display: inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </button>

                            <div class="cc-small" style="margin-top: 18px; text-align: center;">
                                Looking for admin management? <a href="admin.html" style="color: var(--cc-accent); text-decoration: underline;">Open Admin Portal</a>
                            </div>
                        </div>
                    </div>
                `;
} else if (['creator', 'agency', 'brand'].includes(state.page)) {
                const role = state.page;
                const isAgency = role === 'agency';
                const isBrand = role === 'brand';
                const roleLabel = isAgency ? 'Agency' : isBrand ? 'Brand' : 'Creator';
                const roleName = isAgency ? 'Studio North' : isBrand ? 'Vela Active' : 'Thando Mokoena';
                const tabs = isAgency ? ['Overview', 'Campaigns', 'People'] : isBrand ? ['Overview', 'Campaigns', 'Reviews'] : ['Overview', 'Campaigns', 'Finances'];
                const activeTab = tabs.includes(state.activeWorkspaceTab) ? state.activeWorkspaceTab : 'Overview';
                const sample = isAgency ? {
                    eyebrow: 'Agency desk / Sample data',
                    title: 'Work that needs a decision.',
                    description: 'One campaign record keeps the brief, creator handoff and review trail together.',
                    action: 'Review the first draft',
                    owner: 'Agency review',
                    next: 'Check Thando’s first video against the brief, then send a decision.',
                    status: 'Needs review'
                } : isBrand ? {
                    eyebrow: 'Brand view / Sample data',
                    title: 'See what is ready for you.',
                    description: 'A clear view of the campaign you share with the agency—without its private roster or other clients.',
                    action: 'Review the approved draft',
                    owner: 'Brand decision',
                    next: 'The agency has checked the first video. Approve it or request a revision.',
                    status: 'Awaiting decision'
                } : {
                    eyebrow: 'Creator view / Sample data',
                    title: 'Know what comes next.',
                    description: 'Your assignments and feedback live beside the brief. Personal finances stay in your own space.',
                    action: 'Open your assignment',
                    owner: 'Creator handoff',
                    next: 'Confirm the brief and share the first draft link with the agency.',
                    status: 'Draft in progress'
                };
                let previewBody = '';
                if (activeTab === 'Overview') {
                    previewBody = `
                        <div class="ccf-preview-grid">
                            <div class="ccf-preview-main">
                                <div class="ccf-preview-section-head"><span>01 / NEXT HANDOFF</span><span>Spring in motion</span></div>
                                <article class="ccf-preview-decision">
                                    <div class="ccf-preview-decision-top"><span class="ccf-preview-dot"></span><span>${sample.owner}</span><strong>${sample.status}</strong></div>
                                    <h2>${sample.next}</h2>
                                    <p>Vela Active × Studio North × Thando Mokoena</p>
                                    <button type="button" class="cc-btn cc-primary" data-command="openCampaignFlow('${role}')">${sample.action} ↗</button>
                                </article>
                                <div class="ccf-preview-section-head"><span>02 / CAMPAIGN RECORD</span><span>Shared where relevant</span></div>
                                <div class="ccf-preview-record">
                                    <div><span>Brief</span><strong>Outdoor movement campaign</strong></div>
                                    <div><span>Deliverable</span><strong>First video draft</strong></div>
                                    <div><span>Review</span><strong>${sample.owner}</strong></div>
                                    <div><span>Published results</span><strong>Added after posting</strong></div>
                                </div>
                            </div>
                            <aside class="ccf-preview-aside">
                                <span class="ccf-preview-aside-label">The working agreement</span>
                                <h3>Everyone sees their part.</h3>
                                <p>${isAgency ? 'The agency owns coordination and quality review. The brand sees its campaign; the creator sees their assignment.' : isBrand ? 'See only campaigns shared with your team, with the relevant deliverables and decisions.' : 'See your scope and feedback. Your personal income and expenses are not shared with the agency or brand.'}</p>
                                <button type="button" class="ccf-preview-text-action" data-command="setPage('journey')">Explore the full handoff <span aria-hidden="true">↗</span></button>
                            </aside>
                        </div>`;
                } else if (activeTab === 'Campaigns') {
                    previewBody = `
                        <div class="ccf-preview-section-head"><span>CAMPAIGN WORK / SAMPLE DATA</span><span>1 active record</span></div>
                        <div class="ccf-preview-list">
                            <button type="button" data-command="openCampaignFlow('${role}')">
                                <span class="ccf-preview-list-index">01</span>
                                <span><strong>Spring in motion</strong><small>Vela Active × Studio North × Thando Mokoena</small></span>
                                <em>${sample.status}</em><b aria-hidden="true">↗</b>
                            </button>
                        </div>
                        <p class="ccf-preview-footnote">This sample illustrates the workflow. The live workspace shows only campaigns your account can access.</p>`;
                } else {
                    const heading = isAgency ? 'People in the work.' : isBrand ? 'Decisions with context.' : 'A separate personal space.';
                    const detail = isAgency ? 'See creators attached to a campaign, their assignment and the current handoff. A standalone searchable roster is planned, not available in this release.' : isBrand ? 'Review the agency-checked draft with the brief beside it. Approval and revision decisions stay in the campaign record.' : 'Your campaign assignments are shared with collaborators. Your income and expenses remain private and are never shown in this preview.';
                    previewBody = `
                        <div class="ccf-preview-explainer">
                            <span>${activeTab.toUpperCase()} / SAMPLE DATA</span>
                            <h2>${heading}</h2><p>${detail}</p>
                            <button type="button" class="cc-btn cc-primary" data-command="openCampaignFlow('${role}')">See the shared campaign ↗</button>
                        </div>`;
                }
                viewport.innerHTML = `
                    <section class="ccf-preview-shell" aria-label="${roleLabel} sample workspace">
                        <aside class="ccf-preview-side">
                            <a href="#landing" data-command="setPage('landing')" class="ccf-preview-brand">Creator Cash Flow<span>Campaign desk</span></a>
                            <span class="ccf-preview-side-label">${roleLabel} perspective</span>
                            <nav aria-label="Preview sections">
                                ${tabs.map(tab => `<button type="button" class="${activeTab === tab ? 'is-active' : ''}" ${activeTab === tab ? 'aria-current="page"' : ''} data-command="setWorkspaceTab('${tab}')">${tab}</button>`).join('')}
                            </nav>
                            <div class="ccf-preview-side-bottom">Illustrative sample.<br>No live data or payment actions.</div>
                        </aside>
                        <div class="ccf-preview-content">
                            <div class="ccf-preview-topline"><span>${roleName}</span><span>Product preview / ${roleLabel}</span></div>
                            <div class="ccf-preview-mobile-tabs" role="navigation" aria-label="Preview sections">
                                ${tabs.map(tab => `<button type="button" class="${activeTab === tab ? 'is-active' : ''}" ${activeTab === tab ? 'aria-current="page"' : ''} data-command="setWorkspaceTab('${tab}')">${tab}</button>`).join('')}
                            </div>
                            <header class="ccf-preview-hero"><span>${sample.eyebrow}</span><h1>${sample.title}</h1><p>${sample.description}</p></header>
                            ${previewBody}
                        </div>
                    </section>
                `;
            } else if (state.page === 'journey') {
                const s = stages[state.step];
                viewport.innerHTML = `
                    <section class="cc-flow">
                        <div class="cc-title-row">
                            <div>
                                <div class="cc-kicker">One campaign. Three perspectives.</div>
                                <h2>Spring in motion</h2>
                                <p class="cc-small">Vela Active × Studio North × Thando Mokoena</p>
                            </div>
                            <span class="cc-badge-journey">Shared campaign workspace</span>
                        </div>

                        <div class="cc-steps">
                            ${stages.map((x, i) => `
                                <button class="cc-step-btn" data-step="${i}" aria-pressed="${i === state.step}" data-command="setStep(${i})">
                                    <span style="color: ${i === state.step ? '#A3E635' : 'var(--cc-muted)'}">0${i + 1} · ${x[0]}</span><br>
                                    <strong>${x[1]}</strong>
                                </button>
                            `).join('')}
                        </div>

                        <div class="cc-flow-detail">
                            <div class="cc-box">
                                <div class="cc-kicker" style="color: #A3E635;">${s[0]} is responsible</div>
                                <h2>${s[1]}</h2>
                                <p class="cc-small" style="margin-bottom: 20px;">${s[2]}</p>

                                <div class="cc-campaign-banner">
                                    <div class="cc-small" style="letter-spacing: 1px; color: #A3E635; font-weight: 700;">SPRING IN MOTION</div>
                                    <h3 style="font-size: 22px; margin: 8px 0;">${s[5]}</h3>
                                    <div class="cc-small">Campaign #CCF-024 · shared record</div>
                                </div>

                                <button class="cc-btn cc-primary" data-command="nextStep()" style="padding: 12px 24px; font-size: 14px;">${s[3]} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; vertical-align: -2px; display: inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
                                <div class="cc-small" style="margin-top: 14px;">
                                    ${state.step === 5 ? 'Participant-entered results are labelled manual, not platform-verified.' : 'Next handoff: ' + s[4]}
                                </div>
                            </div>

                            <div class="cc-box">
                                <h3>Who sees what</h3>
                                ${renderRow('Creator', 'Own assignment and private finances', 'Private')}
                                ${renderRow('Agency', 'Assigned creators, reviews and budget', 'Managed')}
                                ${renderRow('Brand', 'Campaign spend and final approvals', 'Campaign')}
                                <div class="cc-small" style="margin-top: 18px; line-height: 1.6;">
                                    Personal income and other client campaigns stay private. Shared comments stay with this campaign.
                                </div>
                            </div>
                        </div>
                    </section>
                `;
            }

            if (window.lucide) {
                lucide.createIcons();
            }
            const demoLink = document.querySelector('.public-header .public-nav .primary-link');
            if (demoLink) { demoLink.href = '#request-demo'; demoLink.textContent = 'Request the demo'; }
        }

        function syncDemoEmail(role) {
            const input = document.getElementById('demo-email-input');
            if (!input) return;
            if (role === 'creator') input.value = 'thando@example.com';
            else if (role === 'agency') input.value = 'contact@studionorth.co.za';
            else if (role === 'brand') input.value = 'campaigns@velaactive.com';
        }

        function executeDemoLogin() {
            const select = document.getElementById('demo-role-select');
            const targetRole = select ? select.value : 'creator';
            setPage(targetRole);
        }

        // Initialize App on DOM Ready & Support URL Hash Routing
        document.addEventListener('DOMContentLoaded', () => {
            const hash = window.location.hash.replace('#', '');
            if (['landing', 'login', 'creator', 'agency', 'brand', 'journey'].includes(hash)) {
                state.page = hash;
            }
            render();

            window.addEventListener('hashchange', () => {
                const newHash = window.location.hash.replace('#', '');
                if (newHash === 'request-demo') {
                    setPage('landing', false);
                    requestAnimationFrame(() => document.getElementById('request-demo')?.scrollIntoView());
                    return;
                }
                if (['landing', 'login', 'creator', 'agency', 'brand', 'journey'].includes(newHash)) {
                    if (state.page !== newHash) {
                        setPage(newHash, false);
                    }
                }
            });
        });

