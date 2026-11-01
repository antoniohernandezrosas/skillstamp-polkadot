import {
  connect,
  issueCredential,
  readCredential,
  readMyCredentials,
  revokeCredential,
  type ConnectedAccount
} from './hub';

import type {
  Credential
} from './contract';

function escapeHtml(
  text: string
): string {

  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function short(
  address: string
): string {

  if (address.length < 15) {
    return address;
  }

  return (
    address.slice(0, 8) +
    '…' +
    address.slice(-6)
  );
}

function formatDate(
  timestamp: bigint
): string {

  return new Intl
    .DateTimeFormat(
      'es-MX',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    )
    .format(
      new Date(
        Number(timestamp) *
        1000
      )
    );
}

function errorText(
  error: unknown
): string {

  return error instanceof Error
    ? error.message
    : String(error);
}

export function startSkillStamp(
  root: HTMLElement
) {

  let session:
    ConnectedAccount | null =
      null;

  let credentials:
    Credential[] = [];

  root.innerHTML = `
    <div class="app">

      <header class="topbar">

        <div class="brand">
          <div class="brand-icon">
            SS
          </div>

          <div>
            <strong>SkillStamp</strong>
            <small>UANL · Polkadot</small>
          </div>
        </div>

        <span class="network">
          <i></i>
          Products Devnet
        </span>

      </header>

      <main>

        <section class="hero">

          <div class="hero-content">

            <span class="eyebrow">
              CREDENCIALES ACADÉMICAS · ON-CHAIN
            </span>

            <h1>
              Tu talento merece
              <span>
                evidencia verificable.
              </span>
            </h1>

            <p>
              Emite y verifica logros
              académicos directamente en
              Polkadot. Sin depender de un
              PDF como fuente de verdad.
            </p>

            <button
              id="connect"
              class="primary"
            >
              Conectar Polkadot App
            </button>

          </div>

          <div class="hero-seal">

            <div>✓</div>

            <strong>
              VERIFIED
            </strong>

            <span>
              POLKADOT
            </span>

          </div>

        </section>

        <section class="account-card">

          <div>

            <small>
              PRODUCT ACCOUNT
            </small>

            <strong id="account">
              No conectada
            </strong>

            <span id="account-description">
              Conecta tu Product para continuar.
            </span>

          </div>

          <div
            id="role"
            class="role"
          >
            OFFLINE
          </div>

        </section>

        <section class="metrics">

          <article>
            <span>
              Mis credenciales
            </span>

            <strong id="credential-count">
              —
            </strong>
          </article>

          <article>
            <span>
              Rol
            </span>

            <strong id="role-stat">
              —
            </strong>
          </article>

          <article>
            <span>
              Fuente de verdad
            </span>

            <strong>
              Asset Hub
            </strong>
          </article>

        </section>

        <nav class="tabs">

          <button
            class="tab active"
            data-tab="credentials"
          >
            Credenciales
          </button>

          <button
            id="issue-tab"
            class="tab"
            data-tab="issue"
            disabled
          >
            Emitir
          </button>

          <button
            class="tab"
            data-tab="verify"
          >
            Verificar
          </button>

        </nav>

        <section
          class="panel"
          data-panel="credentials"
        >

          <div class="panel-header">

            <div>
              <small>
                WALLET ACADÉMICA
              </small>

              <h2>
                Mis credenciales
              </h2>
            </div>

            <button
              id="refresh"
              class="small-button"
            >
              Actualizar
            </button>

          </div>

          <div
            id="credentials"
            class="credential-grid"
          ></div>

        </section>

        <section
          class="panel"
          data-panel="issue"
          hidden
        >

          <div class="panel-header">

            <div>
              <small>
                ISSUER MODE
              </small>

              <h2>
                Emitir credencial
              </h2>
            </div>

          </div>

          <form
            id="issue-form"
            class="form"
          >

            <label>
              Dirección H160 del estudiante

              <input
                id="student"
                placeholder="0x..."
                autocomplete="off"
                required
              >
            </label>

            <button
              id="use-me"
              class="link-button"
              type="button"
            >
              Usar mi Product Account
            </button>

            <div class="two-columns">

              <label>
                Nombre de la credencial

                <input
                  id="title"
                  placeholder="Polkadot Builder"
                  maxlength="80"
                  required
                >
              </label>

              <label>
                Organización

                <input
                  id="organization"
                  value="Universidad Autónoma de Nuevo León"
                  maxlength="100"
                  required
                >
              </label>

            </div>

            <label>
              CID de evidencia
              <small>opcional</small>

              <input
                id="cid"
                placeholder="bafy..."
                maxlength="180"
              >
            </label>

            <div class="notice">

              <strong>
                Credencial verificable
              </strong>

              <p>
                La emisión será firmada
                desde Polkadot App y quedará
                registrada en Asset Hub.
              </p>

            </div>

            <button
              class="primary full"
              type="submit"
            >
              Emitir y firmar
            </button>

          </form>

        </section>

        <section
          class="panel"
          data-panel="verify"
          hidden
        >

          <div class="panel-header">

            <div>
              <small>
                VERIFICADOR
              </small>

              <h2>
                Verificar credencial
              </h2>
            </div>

          </div>

          <div class="verify-form">

            <input
              id="verify-id"
              type="number"
              min="1"
              placeholder="ID de credencial"
            >

            <button
              id="verify"
              class="secondary"
            >
              Verificar
            </button>

          </div>

          <div id="verification"></div>

        </section>

        <section class="explanation">

          <small>
            POR QUÉ SKILLSTAMP
          </small>

          <h2>
            De un PDF falsificable
            a una prueba verificable.
          </h2>

          <div class="steps">

            <article>
              <span>01</span>

              <strong>
                Emitir
              </strong>

              <p>
                Una cuenta autorizada
                reconoce un logro.
              </p>
            </article>

            <article>
              <span>02</span>

              <strong>
                Firmar
              </strong>

              <p>
                La llave permanece dentro
                de Polkadot App.
              </p>
            </article>

            <article>
              <span>03</span>

              <strong>
                Verificar
              </strong>

              <p>
                La credencial se consulta
                directamente en Asset Hub.
              </p>
            </article>

          </div>

        </section>

      </main>

      <footer>

        <strong>
          SkillStamp
        </strong>

        <span>
          Prototipo independiente para hackathon.
          Inspirado en la identidad azul y oro
          de la UANL.
        </span>

      </footer>

      <div
        id="toast"
        class="toast"
      ></div>

      <div
        id="loading"
        class="loading"
        hidden
      >

        <div class="spinner"></div>

        <strong id="loading-text">
          Procesando…
        </strong>

      </div>

    </div>
  `;

  const get =
    <T extends Element>(
      selector: string
    ): T => {

      const element =
        root.querySelector<T>(
          selector
        );

      if (!element) {
        throw new Error(
          `No existe ${selector}`
        );
      }

      return element;
    };

  const connectButton =
    get<HTMLButtonElement>(
      '#connect'
    );

  const accountElement =
    get<HTMLElement>(
      '#account'
    );

  const accountDescription =
    get<HTMLElement>(
      '#account-description'
    );

  const roleElement =
    get<HTMLElement>(
      '#role'
    );

  const countElement =
    get<HTMLElement>(
      '#credential-count'
    );

  const roleStat =
    get<HTMLElement>(
      '#role-stat'
    );

  const issueTab =
    get<HTMLButtonElement>(
      '#issue-tab'
    );

  const credentialsElement =
    get<HTMLElement>(
      '#credentials'
    );

  const refreshButton =
    get<HTMLButtonElement>(
      '#refresh'
    );

  const issueForm =
    get<HTMLFormElement>(
      '#issue-form'
    );

  const studentInput =
    get<HTMLInputElement>(
      '#student'
    );

  const titleInput =
    get<HTMLInputElement>(
      '#title'
    );

  const organizationInput =
    get<HTMLInputElement>(
      '#organization'
    );

  const cidInput =
    get<HTMLInputElement>(
      '#cid'
    );

  const useMeButton =
    get<HTMLButtonElement>(
      '#use-me'
    );

  const verifyInput =
    get<HTMLInputElement>(
      '#verify-id'
    );

  const verifyButton =
    get<HTMLButtonElement>(
      '#verify'
    );

  const verification =
    get<HTMLElement>(
      '#verification'
    );

  const toast =
    get<HTMLElement>(
      '#toast'
    );

  const loading =
    get<HTMLElement>(
      '#loading'
    );

  const loadingText =
    get<HTMLElement>(
      '#loading-text'
    );

  function showToast(
    message: string,
    error = false
  ) {

    toast.textContent =
      message;

    toast.classList.toggle(
      'error',
      error
    );

    toast.classList.add(
      'visible'
    );

    window.setTimeout(
      () =>
        toast.classList.remove(
          'visible'
        ),
      4000
    );
  }

  function setLoading(
    value: boolean,
    text =
      'Procesando…'
  ) {

    loading.hidden =
      !value;

    loadingText.textContent =
      text;
  }

  function selectTab(
    name: string
  ) {

    if (
      name === 'issue' &&
      !session?.isIssuer
    ) {
      showToast(
        'Tu cuenta no es un emisor autorizado.',
        true
      );

      return;
    }

    root
      .querySelectorAll<
        HTMLButtonElement
      >(
        '.tab'
      )
      .forEach(
        tab => {

          tab.classList.toggle(
            'active',
            tab.dataset.tab ===
              name
          );
        }
      );

    root
      .querySelectorAll<
        HTMLElement
      >(
        '[data-panel]'
      )
      .forEach(
        panel => {

          panel.hidden =
            panel.dataset.panel !==
            name;
        }
      );
  }

  function credentialHtml(
    credential: Credential
  ): string {

    const valid =
      credential.valid &&
      !credential.revoked;

    const canRevoke =
      session !== null &&
      session.h160
        .toLowerCase() ===
      credential.issuer
        .toLowerCase();

    return `
      <article
        class="credential ${
          valid
            ? ''
            : 'revoked'
        }"
      >

        <div class="credential-top">

          <div class="medal">
            ${valid ? '✓' : '×'}
          </div>

          <span
            class="status ${
              valid
                ? 'valid'
                : 'invalid'
            }"
          >
            ${
              valid
                ? 'VERIFICADA'
                : 'REVOCADA'
            }
          </span>

        </div>

        <small>
          CREDENCIAL
          #${credential.id.toString()}
        </small>

        <h3>
          ${
            escapeHtml(
              credential.title
            )
          }
        </h3>

        <p class="org">
          ${
            escapeHtml(
              credential.organization
            )
          }
        </p>

        <dl>

          <div>
            <dt>Estudiante</dt>
            <dd>
              ${
                short(
                  credential.student
                )
              }
            </dd>
          </div>

          <div>
            <dt>Emisor</dt>
            <dd>
              ${
                short(
                  credential.issuer
                )
              }
            </dd>
          </div>

          <div>
            <dt>Fecha</dt>
            <dd>
              ${
                formatDate(
                  credential.issuedAt
                )
              }
            </dd>
          </div>

        </dl>

        ${
          credential.metadataCid
            ? `
              <code class="cid">
                ${
                  escapeHtml(
                    credential.metadataCid
                  )
                }
              </code>
            `
            : ''
        }

        <div class="card-actions">

          <button
            data-verify-id="${
              credential.id.toString()
            }"
          >
            Verificar
          </button>

          ${
            canRevoke &&
            valid
              ? `
                <button
                  class="danger"
                  data-revoke-id="${
                    credential.id.toString()
                  }"
                >
                  Revocar
                </button>
              `
              : ''
          }

        </div>

      </article>
    `;
  }

  function renderCredentials() {

    if (!session) {

      credentialsElement.innerHTML = `
        <div class="empty">
          <span>◇</span>

          <h3>
            Conecta Polkadot App
          </h3>

          <p>
            Tus credenciales aparecerán
            aquí.
          </p>
        </div>
      `;

      return;
    }

    if (
      credentials.length === 0
    ) {

      credentialsElement.innerHTML = `
        <div class="empty">
          <span>✦</span>

          <h3>
            Sin credenciales todavía
          </h3>

          <p>
            Emite la primera credencial
            para demostrar SkillStamp.
          </p>
        </div>
      `;

      return;
    }

    credentialsElement.innerHTML =
      credentials
        .map(
          credentialHtml
        )
        .join('');
  }

  function renderVerification(
    credential: Credential
  ) {

    const valid =
      credential.valid &&
      !credential.revoked;

    verification.innerHTML = `
      <article
        class="verification ${
          valid
            ? 'verified'
            : 'not-verified'
        }"
      >

        <div class="verification-mark">
          ${valid ? '✓' : '×'}
        </div>

        <small>
          RESULTADO ON-CHAIN
        </small>

        <h3>
          ${
            valid
              ? 'Credencial auténtica'
              : 'Credencial revocada'
          }
        </h3>

        <strong>
          #${credential.id.toString()}
          ·
          ${
            escapeHtml(
              credential.title
            )
          }
        </strong>

        <p>
          ${
            escapeHtml(
              credential.organization
            )
          }
        </p>

        <dl>

          <div>
            <dt>Titular</dt>
            <dd>
              ${
                short(
                  credential.student
                )
              }
            </dd>
          </div>

          <div>
            <dt>Emisor</dt>
            <dd>
              ${
                short(
                  credential.issuer
                )
              }
            </dd>
          </div>

          <div>
            <dt>Fecha</dt>
            <dd>
              ${
                formatDate(
                  credential.issuedAt
                )
              }
            </dd>
          </div>

        </dl>

      </article>
    `;
  }

  async function refreshCredentials() {

    credentials =
      await readMyCredentials();

    countElement.textContent =
      String(
        credentials.length
      );

    renderCredentials();
  }

  connectButton.addEventListener(
    'click',
    async () => {

      setLoading(
        true,
        'Conectando con Polkadot App…'
      );

      try {

        session =
          await connect();

        accountElement.textContent =
          short(
            session.h160
          );

        accountElement.title =
          session.h160;

        accountDescription.textContent =
          session.isIssuer
            ? 'Cuenta emisora autorizada.'
            : 'Cuenta conectada como estudiante.';

        roleElement.textContent =
          session.isIssuer
            ? 'EMISOR'
            : 'ESTUDIANTE';

        roleElement.classList.add(
          'online'
        );

        roleStat.textContent =
          session.isIssuer
            ? 'Emisor'
            : 'Estudiante';

        issueTab.disabled =
          !session.isIssuer;

        studentInput.value =
          session.h160;

        await refreshCredentials();

        showToast(
          'Polkadot App conectada.'
        );

      } catch (error) {

        showToast(
          errorText(error),
          true
        );

      } finally {

        setLoading(false);
      }
    }
  );

  refreshButton.addEventListener(
    'click',
    async () => {

      if (!session) {

        showToast(
          'Conecta primero.',
          true
        );

        return;
      }

      setLoading(
        true,
        'Actualizando credenciales…'
      );

      try {

        await refreshCredentials();

      } catch (error) {

        showToast(
          errorText(error),
          true
        );

      } finally {

        setLoading(false);
      }
    }
  );

  root
    .querySelectorAll<
      HTMLButtonElement
    >(
      '.tab'
    )
    .forEach(
      tab => {

        tab.addEventListener(
          'click',
          () => {

            const target =
              tab.dataset.tab;

            if (target) {
              selectTab(target);
            }
          }
        );
      }
    );

  useMeButton.addEventListener(
    'click',
    () => {

      if (session) {
        studentInput.value =
          session.h160;
      }
    }
  );

  issueForm.addEventListener(
    'submit',
    async event => {

      event.preventDefault();

      setLoading(
        true,
        'Firma la emisión en Polkadot App…'
      );

      try {

        const credential =
          await issueCredential({
            student:
              studentInput.value,

            title:
              titleInput.value,

            organization:
              organizationInput.value,

            metadataCid:
              cidInput.value
          });

        verifyInput.value =
          credential.id.toString();

        renderVerification(
          credential
        );

        if (
          session &&
          credential.student
            .toLowerCase() ===
          session.h160
            .toLowerCase()
        ) {
          await refreshCredentials();
        }

        titleInput.value =
          '';

        cidInput.value =
          '';

        selectTab(
          'verify'
        );

        showToast(
          `Credencial #${
            credential.id.toString()
          } emitida correctamente.`
        );

      } catch (error) {

        showToast(
          errorText(error),
          true
        );

      } finally {

        setLoading(false);
      }
    }
  );

  verifyButton.addEventListener(
    'click',
    async () => {

      if (!session) {

        showToast(
          'Conecta Polkadot App primero.',
          true
        );

        return;
      }

      try {

        const id =
          BigInt(
            verifyInput.value
          );

        if (id <= 0n) {
          throw new Error(
            'ID inválido.'
          );
        }

        setLoading(
          true,
          'Verificando en Asset Hub…'
        );

        const credential =
          await readCredential(id);

        renderVerification(
          credential
        );

      } catch (error) {

        verification.innerHTML = `
          <div class="empty">
            <span>×</span>

            <h3>
              No encontrada
            </h3>

            <p>
              Revisa el ID de la credencial.
            </p>
          </div>
        `;

        showToast(
          errorText(error),
          true
        );

      } finally {

        setLoading(false);
      }
    }
  );

  credentialsElement.addEventListener(
    'click',
    async event => {

      const button =
        (
          event.target as HTMLElement
        ).closest<HTMLButtonElement>(
          'button'
        );

      if (!button) {
        return;
      }

      const credentialId =
        button.dataset.verifyId;

      if (credentialId) {

        verifyInput.value =
          credentialId;

        selectTab('verify');

        verifyButton.click();

        return;
      }

      const revokeId =
        button.dataset.revokeId;

      if (!revokeId) {
        return;
      }

      setLoading(
        true,
        'Firma la revocación…'
      );

      try {

        const credential =
          await revokeCredential(
            BigInt(revokeId)
          );

        renderVerification(
          credential
        );

        await refreshCredentials();

        selectTab(
          'verify'
        );

        showToast(
          `Credencial #${revokeId} revocada.`
        );

      } catch (error) {

        showToast(
          errorText(error),
          true
        );

      } finally {

        setLoading(false);
      }
    }
  );

  renderCredentials();
}
