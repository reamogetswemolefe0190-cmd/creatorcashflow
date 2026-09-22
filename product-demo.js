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
                'Brand',
                'Create the brief',
                'Set the budget, deliverables, usage rights and deadline.',
                'Publish campaign brief',
                'Agency receives a campaign invitation.',
                'R60,000 campaign budget'
            ],
            [
                'Agency',
                'Build the creator team',
                'Match the brief to the roster and agree each creator’s fee.',
                'Send creator invitation',
                'Creator receives the scope, dates and offer.',
                'R12,000 creator offer'
            ],
            [
                'Creator',
                'Accept and create',
                'Accept the offer, then submit the first video for review.',
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
                'Approve the content or request a revision in the same thread.',
                'Approve deliverable',
                'Creator receives approval and the publishing schedule.',
                'Approved · publish 18 Sep'
            ],
            [
                'Creator',
                'Track payment',
                'Upload the live link and invoice; agency confirms the payment status.',
                'Mark invoice as sent',
                'Brand and agency see the invoice; creator sees the due date.',
                'R12,000 · due 30 Sep'
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
                const isCreator = role === 'creator';
                const isAgency = role === 'agency';
                const isBrand = role === 'brand';

                const roleLabel = isCreator ? 'Creator' : isAgency ? 'Agency' : 'Brand';
                const roleName = isCreator ? 'Thando' : isAgency ? 'Studio North' : 'Vela Active';
                const roleAvatar = isCreator ? 'TM' : isAgency ? 'SN' : 'VA';

                const metrics = isCreator ? [
                    ['Received this month', 'R38,500', 'Across 4 payments'],
                    ['Awaiting payment', 'R18,000', '2 invoices outstanding'],
                    ['Active campaigns', '3', '1 action needs you']
                ] : isAgency ? [
                    ['Active campaigns', '8', 'Across 4 brand clients'],
                    ['Creators on roster', '24', '6 on active briefs'],
                    ['Awaiting review', '5', '2 due this week']
                ] : [
                    ['Campaign budget', 'R60,000', 'Spring in motion'],
                    ['Committed spend', 'R42,000', 'R18,000 unallocated'],
                    ['Deliverables approved', '8 / 12', '4 still in review']
                ];

                // Sub-view rendering based on state.activeWorkspaceTab
                let subViewContent = '';

                if (state.activeWorkspaceTab === 'Overview') {
                    subViewContent = `
                        <div class="cc-creator-next">
                            <div>
                                <h3>Sample campaign needs attention</h3>
                                <p>Your action is required to move the Spring in Motion campaign forward.</p>
                            </div>
                            <button class="cc-btn cc-primary cc-btn-nav" data-command="openCampaignFlow('${role}')">Open shared campaign <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; vertical-align: -2px; display: inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
                        </div>
                        <div class="cc-metrics">
                            ${metrics.map(m => `
                                <div class="cc-metric">
                                    <div>
                                        <div class="cc-small">${m[0]}</div>
                                        <div class="cc-num">${m[1]}</div>
                                    </div>
                                    <span class="cc-small">${m[2]}</span>
                                </div>
                            `).join('')}
                        </div>

                        <div class="cc-columns">
                            <div>
                                <!-- Needs Attention Banner -->
                                <div class="cc-campaign-banner">
                                    ${getPhotoHtml(isCreator ? 'creator' : 'team').replace('<img ', '<img class="ce-mini-photo" ')}
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span class="cc-small" style="letter-spacing: 1px; color: #A3E635; font-weight: 700;">NEEDS YOUR ATTENTION</span>
                                        <span>↗</span>
                                    </div>
                                    <h3>Spring in motion</h3>
                                    <p class="cc-small" style="color: #C6D8CB; margin-bottom: 18px;">
                                        ${isCreator ? 'Your first video draft is due on 16 September.' : isAgency ? 'Thando’s first video is ready for your quality check.' : 'The agency has sent 2 deliverables for final approval.'}
                                    </p>
                                    <button class="cc-btn cc-primary" data-command="openCampaignFlow('${role}')">
                                        ${isCreator ? 'Open deliverables' : isAgency ? 'Review submissions' : 'Review & approve'} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; vertical-align: -2px; display: inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                    </button>
                                </div>

                                <!-- Middle Box (Payments / Roster / Performance) -->
                                <div class="cc-box">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                                        <h3>${isCreator ? 'Upcoming payments' : isAgency ? 'Creator roster' : 'Campaign performance'}</h3>
                                        <button class="cc-link" data-command="setWorkspaceTab('${isCreator ? 'Income' : isAgency ? 'Roster' : 'Partners'}')">View all <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; vertical-align: -2px; display: inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
                                    </div>
                                    ${isCreator ? (
                                        renderRow('Vela Active', 'Spring in motion · due 30 Sep', 'R12,000') +
                                        renderRow('Homegrown Coffee', 'Morning ritual · due 24 Sep', 'R6,000')
                                    ) : isAgency ? (
                                        renderRow('Thando Mokoena', 'Lifestyle · Spring in motion', 'Draft ready') +
                                        renderRow('Naledi Dube', 'Wellness · Spring in motion', 'Creating') +
                                        renderRow('Sipho Khumalo', 'Fitness · Weekend movement', 'Approved')
                                    ) : (
                                        renderRow('Views', 'Across 8 published deliverables', '128,400') +
                                        renderRow('Engagement rate', 'Interactions ÷ views', '4.8%') +
                                        renderRow('Link clicks', 'Tracked campaign links', '2,140')
                                    )}
                                </div>
                            </div>

                            <div>
                                <!-- Right Box: Progress Checklist & Chat Snippet -->
                                <div class="cc-box">
                                    <h3>${isCreator ? 'Your campaign checklist' : isAgency ? 'Approval queue' : 'Delivery progress'}</h3>
                                    ${renderRow('Brief & fee agreed', 'Vela Active · campaign #024', 'Done', 'cc-tag-completed')}
                                    ${renderRow('First video draft', 'Thando Mokoena · 16 Sep', isCreator ? 'Due next' : 'In review', 'cc-tag-pending')}
                                    ${renderRow('Brand approval', 'Vela Active · 18 Sep', 'Upcoming')}
                                    
                                    <div class="cc-progress">
                                        <span style="width: 40%;"></span>
                                    </div>
                                    <div class="cc-small">2 of 5 milestones complete</div>

                                    <hr style="border: 0; border-top: 1px solid var(--cc-line); margin: 22px 0;">

                                    <h3>Campaign conversation</h3>
                                    <div class="cc-small" style="display: flex; align-items: center; gap: 8px;">
                                        <span class="cc-avatar" style="width: 24px; height: 24px; font-size: 10px;">SN</span>
                                        Studio North · 10:24
                                    </div>
                                    <p style="font-size: 13px; margin: 12px 0; color: #E0E7E1; font-style: italic;">
                                        “The updated brief is ready. Please keep the opening shot outdoors.”
                                    </p>
                                    <button class="cc-link" data-command="setWorkspaceTab('Inbox')">
                                        Open conversation <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; vertical-align: -2px; display: inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (state.activeWorkspaceTab === 'Campaigns') {
                    subViewContent = isCreator ? `
                        <div class="cc-subnav-row">
                            <div class="cc-filter-pills">
                                <button class="cc-filter-pill active">All Campaigns (3)</button>
                                <button class="cc-filter-pill">In Production (1)</button>
                                <button class="cc-filter-pill">In Review (1)</button>
                                <button class="cc-filter-pill">Completed (12)</button>
                            </div>
                            <button class="cc-btn cc-primary cc-btn-nav" data-command="setPage('journey')">View Shared Journey Pipeline ↗</button>
                        </div>

                        <div class="cc-table-wrap">
                            <table class="cc-table">
                                <thead>
                                    <tr>
                                        <th>Campaign</th>
                                        <th>Brand & Agency</th>
                                        <th>Scope</th>
                                        <th>Payout</th>
                                        <th>Deadline</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Spring in motion</strong><br><span class="cc-small">#CCF-024</span></td>
                                        <td>Vela Active<br><span class="cc-small">via Studio North</span></td>
                                        <td>1 Video + 3 Stories</td>
                                        <td><strong style="color:#A3E635;">R12,000</strong></td>
                                        <td>16 Sep 2026</td>
                                        <td><span class="cc-tag cc-tag-pending">Draft In Progress</span></td>
                                        <td><button class="cc-btn cc-btn-nav cc-primary" data-command="setPage('journey')">Submit Draft <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; vertical-align: -2px; display: inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Morning Ritual</strong><br><span class="cc-small">#CCF-019</span></td>
                                        <td>Homegrown Coffee<br><span class="cc-small">Direct Partnership</span></td>
                                        <td>2 TikTok Videos</td>
                                        <td><strong style="color:#A3E635;">R6,000</strong></td>
                                        <td>24 Sep 2026</td>
                                        <td><span class="cc-tag cc-tag-completed">Draft Approved</span></td>
                                        <td><button class="cc-btn cc-btn-nav" data-command="downloadInvoiceProof('INV-084')">View Invoice</button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Urban Movement</strong><br><span class="cc-small">#CCF-012</span></td>
                                        <td>Peak Athletics<br><span class="cc-small">via Studio North</span></td>
                                        <td>1 Reel + Photos</td>
                                        <td><strong style="color:#A3E635;">R8,500</strong></td>
                                        <td>31 Aug 2026</td>
                                        <td><span class="cc-tag cc-tag-completed">Paid ✓</span></td>
                                        <td><button class="cc-btn cc-btn-nav" data-command="downloadInvoiceProof('INV-077')">Sample receipt details</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ` : isAgency ? `
                        <div class="cc-subnav-row">
                            <div class="cc-filter-pills">
                                <button class="cc-filter-pill active">All Client Campaigns (8)</button>
                                <button class="cc-filter-pill">Production (3)</button>
                                <button class="cc-filter-pill">Reviewing (5)</button>
                            </div>
                            <button class="cc-btn cc-primary cc-btn-nav" data-command="setPage('journey')">Open Collaborative Pipeline ↗</button>
                        </div>

                        <div class="cc-table-wrap">
                            <table class="cc-table">
                                <thead>
                                    <tr>
                                        <th>Campaign Name</th>
                                        <th>Client Brand</th>
                                        <th>Roster Allocation</th>
                                        <th>Total Budget</th>
                                        <th>Deliverables Status</th>
                                        <th>Stage</th>
                                        <th>Management</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Spring in motion</strong></td>
                                        <td>Vela Active</td>
                                        <td>Thando Mokoena, Naledi D., Sipho K.</td>
                                        <td><strong>R60,000</strong></td>
                                        <td>8 / 12 Approved</td>
                                        <td><span class="cc-tag cc-tag-pending">Draft QC</span></td>
                                        <td><button class="cc-btn cc-btn-nav cc-primary" data-command="setPage('journey')">Manage Brief <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; vertical-align: -2px; display: inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Morning Ritual</strong></td>
                                        <td>Homegrown Coffee</td>
                                        <td>Thando Mokoena, Zanele N.</td>
                                        <td><strong>R25,000</strong></td>
                                        <td>4 / 4 Approved</td>
                                        <td><span class="cc-tag cc-tag-completed">Payment Prep</span></td>
                                        <td><button class="cc-btn cc-btn-nav" data-command="setWorkspaceTab('Inbox')">Client Thread</button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>Urban Movement 2026</strong></td>
                                        <td>Peak Athletics</td>
                                        <td>Sipho Khumalo, 4 creators</td>
                                        <td><strong>R95,000</strong></td>
                                        <td>Brief Issued</td>
                                        <td><span class="cc-tag">Contracting</span></td>
                                        <td><button class="cc-btn cc-btn-nav" data-command="setWorkspaceTab('Roster')">Assign Talent</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <!-- Brand Campaign Management Deck -->
                        <div class="cc-subnav-row">
                            <div class="cc-filter-pills">
                                <button class="cc-filter-pill active">Spring in motion (Active)</button>
                                <button class="cc-filter-pill">Winter Fitness (Archived)</button>
                            </div>
                            <button class="cc-btn cc-primary cc-btn-nav" data-command="setPage('journey')">Inspect Full Brief Pipeline ↗</button>
                        </div>

                        <div class="cc-box">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
                                <div>
                                    <div class="cc-kicker" style="color:#A3E635;">DELIVERABLES AWAITING BRAND APPROVAL</div>
                                    <h3 style="font-size:20px; margin-top:4px;">Pending Creative Sign-off</h3>
                                </div>
                                <span class="cc-tag cc-tag-pending">2 Items Need Your Review</span>
                            </div>

                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                                <div class="cc-box" style="padding:20px; border-radius:12px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                        <strong>Thando Mokoena</strong>
                                        <span class="cc-tag cc-tag-pending">Version 1 · Checked by Agency</span>
                                    </div>
                                    <p class="cc-small" style="margin-bottom:14px;">1x 60s Reel: Outdoor Run & Natural Product Integration in Camps Bay</p>
                                    <div style="display:flex; gap:10px;">
                                        <button class="cc-btn cc-primary cc-btn-nav" data-command="approveBrandDeliverable('Thando Mokoena')">Approve Deliverable ✓</button>
                                        <button class="cc-btn cc-btn-nav" data-command="setWorkspaceTab('Inbox')">Request Revision</button>
                                    </div>
                                </div>

                                <div class="cc-box" style="padding:20px; border-radius:12px;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                        <strong>Naledi Dube</strong>
                                        <span class="cc-tag cc-tag-completed">Approved for 18 Sep</span>
                                    </div>
                                    <p class="cc-small" style="margin-bottom:14px;">3x Instagram Stories: Hydration Routine & Discount Link Sticker</p>
                                    <div style="display:flex; gap:10px;">
                                        <button class="cc-btn cc-btn-nav" data-command="setPage('journey')">View Pipeline Status</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (state.activeWorkspaceTab === 'Income' || state.activeWorkspaceTab === 'Partners' || state.activeWorkspaceTab === 'Roster') {
                    subViewContent = isCreator ? `
                        <!-- Creator Cash Flow Ledger -->
                        <div class="cc-metrics">
                            <div class="cc-metric">
                                <div class="cc-small">September Cash Inflow</div>
                                <div class="cc-num" style="color:#A3E635;">R38,500.00</div>
                                <span class="cc-small">Across 4 verified brand settlements</span>
                            </div>
                            <div class="cc-metric">
                                <div class="cc-small">Outstanding Invoices</div>
                                <div class="cc-num">R18,000.00</div>
                                <span class="cc-small">2 contracts in payment cycle</span>
                            </div>
                            <div class="cc-metric">
                                <div class="cc-small">Average Settlement Speed</div>
                                <div class="cc-num">6.2 Days</div>
                                <span class="cc-small">100% on-time settlement rate</span>
                            </div>
                        </div>

                        <div class="cc-box">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                                <h3>Official Financial & Invoice Ledger</h3>
                                <button class="cc-btn cc-btn-nav" data-command="downloadInvoiceProof('TAX-REPORT-2026')">About sample records</button>
                            </div>

                            <div class="cc-table-wrap">
                                <table class="cc-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice ID</th>
                                            <th>Counterparty Brand</th>
                                            <th>Campaign Reference</th>
                                            <th>Amount (ZAR)</th>
                                            <th>Due Date</th>
                                            <th>Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>#INV-2026-089</strong></td>
                                            <td>Vela Active</td>
                                            <td>Spring in motion #CCF-024</td>
                                            <td><strong>R12,000.00</strong></td>
                                            <td>30 Sep 2026</td>
                                            <td><span class="cc-tag cc-tag-pending">Scheduled Payout</span></td>
                                            <td><button class="cc-btn cc-btn-nav" data-command="downloadInvoiceProof('INV-089')">Sample invoice details</button></td>
                                        </tr>
                                        <tr>
                                            <td><strong>#INV-2026-084</strong></td>
                                            <td>Homegrown Coffee</td>
                                            <td>Morning ritual #CCF-019</td>
                                            <td><strong>R6,000.00</strong></td>
                                            <td>24 Sep 2026</td>
                                            <td><span class="cc-tag cc-tag-pending">Approved & Queued</span></td>
                                            <td><button class="cc-btn cc-btn-nav" data-command="downloadInvoiceProof('INV-084')">Sample invoice details</button></td>
                                        </tr>
                                        <tr>
                                            <td><strong>#INV-2026-077</strong></td>
                                            <td>Peak Athletics</td>
                                            <td>Urban movement #CCF-012</td>
                                            <td><strong>R8,500.00</strong></td>
                                            <td>31 Aug 2026</td>
                                            <td><span class="cc-tag cc-tag-completed">Paid ✓</span></td>
                                            <td><button class="cc-btn cc-btn-nav" data-command="downloadInvoiceProof('INV-077')">Sample receipt details</button></td>
                                        </tr>
                                        <tr>
                                            <td><strong>#INV-2026-062</strong></td>
                                            <td>Cape Botanics</td>
                                            <td>Winter Wellness launch</td>
                                            <td><strong>R12,000.00</strong></td>
                                            <td>15 Aug 2026</td>
                                            <td><span class="cc-tag cc-tag-completed">Paid ✓</span></td>
                                            <td><button class="cc-btn cc-btn-nav" data-command="downloadInvoiceProof('INV-062')">Sample receipt details</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : isAgency ? `
                        <!-- Agency Creator Roster Directory -->
                        <div class="cc-subnav-row">
                            <div class="cc-filter-pills">
                                <button class="cc-filter-pill active">All Roster (24)</button>
                                <button class="cc-filter-pill">Lifestyle & Tech (8)</button>
                                <button class="cc-filter-pill">Wellness & Fitness (11)</button>
                                <button class="cc-filter-pill">Food & Culture (5)</button>
                            </div>
                            <button class="cc-btn cc-primary cc-btn-nav" disabled aria-label="Creator invitations are not available in the demo">Invitations · not available</button>
                        </div>

                        <div class="cc-table-wrap">
                            <table class="cc-table">
                                <thead>
                                    <tr>
                                        <th>Creator</th>
                                        <th>Niche Focus</th>
                                        <th>Audience Reach</th>
                                        <th>Engagement Rate</th>
                                        <th>Active Campaigns</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:10px;">
                                                <span class="cc-avatar" style="width:30px; height:30px; font-size:11px;">TM</span>
                                                <strong>Thando Mokoena</strong>
                                            </div>
                                        </td>
                                        <td>Lifestyle & Outdoor Video</td>
                                        <td>84,200</td>
                                        <td><strong style="color:#A3E635;">4.9%</strong></td>
                                        <td>Spring in motion, Morning ritual</td>
                                        <td><span class="cc-tag cc-tag-completed">Active Brief</span></td>
                                        <td><button class="cc-btn cc-btn-nav" data-command="setWorkspaceTab('Inbox')">Direct Message</button></td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:10px;">
                                                <span class="cc-avatar" style="width:30px; height:30px; font-size:11px;">ND</span>
                                                <strong>Naledi Dube</strong>
                                            </div>
                                        </td>
                                        <td>Wellness & Hydration</td>
                                        <td>112,000</td>
                                        <td><strong style="color:#A3E635;">5.2%</strong></td>
                                        <td>Spring in motion</td>
                                        <td><span class="cc-tag cc-tag-completed">Active Brief</span></td>
                                        <td><button class="cc-btn cc-btn-nav" data-command="setWorkspaceTab('Inbox')">Direct Message</button></td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:10px;">
                                                <span class="cc-avatar" style="width:30px; height:30px; font-size:11px;">SK</span>
                                                <strong>Sipho Khumalo</strong>
                                            </div>
                                        </td>
                                        <td>Athletics & Gym Training</td>
                                        <td>65,400</td>
                                        <td><strong style="color:#A3E635;">6.1%</strong></td>
                                        <td>Spring in motion</td>
                                        <td><span class="cc-tag cc-tag-completed">Active Brief</span></td>
                                        <td><button class="cc-btn cc-btn-nav" data-command="setWorkspaceTab('Inbox')">Direct Message</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <!-- Brand Creator Partners & ROI Scorecard -->
                        <div class="cc-box">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                                <div>
                                    <div class="cc-kicker" style="color:#A3E635;">CAMPAIGN ROSTER & PERFORMANCE METRICS</div>
                                    <h3 style="font-size:20px; margin-top:4px;">Vela Active Activated Partners</h3>
                                </div>
                                <span class="cc-tag cc-tag-completed">3 Creators Active</span>
                            </div>

                            <div class="cc-table-wrap">
                                <table class="cc-table">
                                    <thead>
                                        <tr>
                                            <th>Creator</th>
                                            <th>Deliverables</th>
                                            <th>Allocated Fee</th>
                                            <th>Projected Views</th>
                                            <th>Engagement Rate</th>
                                            <th>Tracked Clicks</th>
                                            <th>Deliverable QC</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>Thando Mokoena</strong></td>
                                            <td>1 Video + 3 Stories</td>
                                            <td><strong>R12,000</strong></td>
                                            <td>45,000</td>
                                            <td><strong style="color:#A3E635;">4.9%</strong></td>
                                            <td>920 clicks</td>
                                            <td><span class="cc-tag cc-tag-pending">Draft In Review</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Naledi Dube</strong></td>
                                            <td>3 Instagram Stories</td>
                                            <td><strong>R15,000</strong></td>
                                            <td>60,000</td>
                                            <td><strong style="color:#A3E635;">5.2%</strong></td>
                                            <td>810 clicks</td>
                                            <td><span class="cc-tag cc-tag-completed">Approved</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Sipho Khumalo</strong></td>
                                            <td>1 TikTok Video</td>
                                            <td><strong>R15,000</strong></td>
                                            <td>40,000</td>
                                            <td><strong style="color:#A3E635;">6.1%</strong></td>
                                            <td>410 clicks</td>
                                            <td><span class="cc-tag cc-tag-completed">Approved</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                } else if (state.activeWorkspaceTab === 'Inbox') {
                    const messages = state.chatMessages[role] || [];
                    subViewContent = `
                        <div class="cc-inbox-layout">
                            <div class="cc-inbox-threads">
                                <div class="cc-thread-item active">
                                    <span class="cc-avatar-mini" style="color:var(--cc-accent);">SN</span>
                                    <div class="cc-thread-info">
                                        <strong>Studio North <span>10:24 AM</span></strong>
                                        <p>Spring in motion: brief update</p>
                                    </div>
                                </div>
                                <div class="cc-thread-item">
                                    <span class="cc-avatar-mini" style="color:#60A5FA;">VA</span>
                                    <div class="cc-thread-info">
                                        <strong>Vela Active <span>Yesterday</span></strong>
                                        <p>Approved deliverable schedule</p>
                                    </div>
                                </div>
                                <div class="cc-thread-item">
                                    <span class="cc-avatar-mini" style="color:#FBBF24;">HC</span>
                                    <div class="cc-thread-info">
                                        <strong>Homegrown Coffee <span>31 Aug</span></strong>
                                        <p>Payment processed successfully</p>
                                    </div>
                                </div>
                            </div>

                            <div class="cc-chat-pane">
                                <div class="cc-chat-header">
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        <span class="cc-avatar-mini" style="color:var(--cc-accent);">SN</span>
                                        <div>
                                            <strong style="font-size:14px; color:#FFFFFF;">Studio North (Nadia - Campaign Lead)</strong>
                                            <div class="cc-small">Campaign #CCF-024 · Spring in motion</div>
                                        </div>
                                    </div>
                                    <button class="cc-btn cc-btn-nav" data-command="setPage('journey')">View Brief Pipeline ↗</button>
                                </div>

                                <div class="cc-chat-messages" id="chat-messages-container">
                                    ${messages.map(m => `
                                        <div class="cc-msg-bubble ${m.incoming ? 'cc-msg-incoming' : 'cc-msg-outgoing'}">
                                            <div style="font-size:11px; font-weight:700; opacity:0.8; margin-bottom:4px;">${m.sender}</div>
                                            <div>${m.text}</div>
                                            <span class="cc-msg-time">${m.time}</span>
                                        </div>
                                    `).join('')}
                                </div>

                                <div class="cc-chat-input-bar">
                                    <input type="text" id="chat-input-field" class="cc-chat-input" placeholder="Type a message or brief update..." />
                                    <button class="cc-btn cc-primary cc-btn-nav" data-command="sendChatMessage('${role}')">Send</button>
                                </div>
                            </div>
                        </div>
                    `;
                }

                viewport.innerHTML = `
                    <div class="cc-shell cc-demo-shell cc-role-${role}">
                        <aside class="cc-side cc-demo-side">
                            <div class="cc-kicker">${roleLabel} workspace · preview</div>
                            <button class="${state.activeWorkspaceTab === 'Overview' ? 'cc-active' : ''}" ${state.activeWorkspaceTab === 'Overview' ? 'aria-current="page"' : ''} data-command="setWorkspaceTab('Overview')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg> Overview
                            </button>
                            <button class="${state.activeWorkspaceTab === 'Campaigns' ? 'cc-active' : ''}" ${state.activeWorkspaceTab === 'Campaigns' ? 'aria-current="page"' : ''} data-command="setWorkspaceTab('Campaigns')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layers"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg> Campaigns
                            </button>
                            <button class="${(state.activeWorkspaceTab === 'Income' || state.activeWorkspaceTab === 'Partners' || state.activeWorkspaceTab === 'Roster') ? 'cc-active' : ''}" ${(state.activeWorkspaceTab === 'Income' || state.activeWorkspaceTab === 'Partners' || state.activeWorkspaceTab === 'Roster') ? 'aria-current="page"' : ''} data-command="setWorkspaceTab('${isCreator ? 'Income' : isAgency ? 'Roster' : 'Partners'}')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> ${isCreator ? 'Income' : isAgency ? 'Creator roster' : 'Creator partners'}
                            </button>
                            <button class="${state.activeWorkspaceTab === 'Inbox' ? 'cc-active' : ''}" ${state.activeWorkspaceTab === 'Inbox' ? 'aria-current="page"' : ''} data-command="setWorkspaceTab('Inbox')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Inbox
                            </button>
                            <button data-command="setPage('journey')">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right-left"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg> Shared journey
                            </button>
                        </aside>

                        <div class="cc-main cc-demo-main">
                            <div class="cc-demo-context"><span><i></i>Interactive product preview</span><b>${roleLabel} perspective</b></div>
                            <div class="cc-title-row cc-demo-title">
                                <div>
                                    <div class="cc-kicker">${roleLabel} / ${state.activeWorkspaceTab}</div>
                                    <h1>${isCreator ? 'Good morning, ' : ''}${roleName}${isCreator ? '.' : ''}</h1>
                                    <p>${isCreator ? 'Your work is moving. Here’s where your money stands.' : isAgency ? 'Your campaigns, creators and next decisions.' : 'See what’s working. Keep your campaign moving.'}</p>
                                </div>
                                <div class="cc-demo-title-actions"><button class="cc-btn cc-primary" data-command="openCampaignFlow('${role}')">Open shared campaign <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px; vertical-align: -2px; display: inline-block;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button><span class="cc-avatar">${roleAvatar}</span></div>
                            </div>

                            ${subViewContent}
                        </div>
                    </div>
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
                                    ${state.step === 5 ? 'Payment is tracked separately from content approval.' : 'Next handoff: ' + s[4]}
                                </div>
                            </div>

                            <div class="cc-box">
                                <h3>Who sees what</h3>
                                ${renderRow('Creator', 'Own fee, tasks and invoice', 'Personal')}
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
                if (['landing', 'login', 'creator', 'agency', 'brand', 'journey'].includes(newHash)) {
                    if (state.page !== newHash) {
                        setPage(newHash, false);
                    }
                }
            });
        });

