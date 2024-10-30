import dayjs from 'dayjs';
import locale from 'dayjs/locale/pt-br'; // Importa a localidade em português do Brasil

dayjs.locale(locale); // Define a localidade

describe('Cálculo de Probabilidade de Gols no Campeonato Brasileiro - Série B', () => {
    const telegramToken = '8024146594:AAF7_cVi3by_5eYbYjOji9VnC-TFCayFVgM'; // Substitua pelo seu token
    const chatIds = [
        //'6617740232',
        '-4519143208',
        //'6662950862',
    ];

    beforeEach(() => {
        cy.visit('https://www.espn.com.br/futebol/calendario/_/liga/bra.2', {timeout: 300000});
        cy.get('button[aria-label="Calendário"]').click();
        // Verifica se o botão "HOJE" está desabilitado
        cy.get('.MonthContainer__ButtonContainer')
            .find('.MonthContainer__button:contains("Hoje")')
            .then(($hojeButton) => {
                if ($hojeButton.hasClass('MonthContainer__button--disableToday')) {
                    // Clica em "CANCELAR" se "HOJE" estiver desabilitado
                    cy.contains('div', 'Cancelar').click();
                    cy.log('Botão "HOJE" desabilitado, clicou em "CANCELAR".');
                } else {
                    // Clica em "HOJE" se estiver habilitado
                    cy.wrap($hojeButton).click({ force: true });
                    cy.log('Botão "HOJE" habilitado, clicou em "HOJE".');
                }
            });
    });

    it('Deve calcular a probabilidade de sair 2 ou mais gols e 1 ou mais gols em cada jogo', () => {
        const diaAtual = dayjs().format('dddd, D [de] MMMM, YYYY'); // Formata a data para o português

        cy.contains(diaAtual).then(($dia) => {
            const jogosHoje = $dia.closest('.ScheduleTables').find('.Table__TR--sm');

            // Verificar se há jogos
            const numJogos = jogosHoje.length;

            if (numJogos === 0) {
                cy.log(`Não há jogos programados para ${diaAtual}.`);
                return; // Sai do teste se não houver jogos
            }

            Cypress._.times(numJogos, (i) => {
                const $jogo = jogosHoje.eq(i); // Pega o jogo da posição i

                const time1 = $jogo.find('.Table__Team.away a').text().trim(); // Nome do primeiro time
                const time2 = $jogo.find('.Table__Team:not(.away) a').text().trim(); // Nome do segundo time
                const jogoLink = $jogo.find('.local a').attr('href'); // Link para a página do jogo
                const horario = $jogo.find('.date__col a').text().trim(); // Obtém o horário do jogo

                // Verifica se o jogo está "LIVE" ou "FT"
                const isLive = $jogo.find('.Schedule__live').length > 0;
                const isFinalizado = $jogo.find('.teams__col a:contains("FT")').length > 0;

                if (isLive) {
                    cy.log(`O jogo ${time1} x ${time2} está ao vivo. Ignorando o cálculo.`);
                    return; // Ignora este jogo se estiver "LIVE"
                }

                if (isFinalizado) {
                    cy.log(`O jogo ${time1} x ${time2} já está finalizado. Ignorando o cálculo.`);
                    return; // Ignora este jogo se já estiver finalizado
                }

                // Acesse a página do jogo
                cy.visit(`https://www.espn.com.br${jogoLink}`, { timeout: 300000 }).then(() => {
                    let jogosTime1 = 0;
                    let jogosTime2 = 0;
                    let time1GolsMarcados = 0;
                    let time1GolsSofridos = 0;
                    let time2GolsMarcados = 0;
                    let time2GolsSofridos = 0;

                    cy.get('h2.ScoreCell__TeamName').then(($h2s) => {
                        const recordTime1 = $h2s.eq(0).closest('.Gamestrip__TeamContent').find('.Gamestrip__Record').text();
                        const recordTime2 = $h2s.eq(1).closest('.Gamestrip__TeamContent').find('.Gamestrip__Record').text();

                        const somaJogos = (record) => {
                            const numeros = record.split(',')[0].split('-').map(Number);
                            return numeros.reduce((acc, num) => acc + num, 0);
                        };

                        jogosTime1 = somaJogos(recordTime1);
                        jogosTime2 = somaJogos(recordTime2);

                        cy.get('.LOSQp.Kiog.TSdsN.lEHQF.Pxeau.FOePw.nbAEp').each(($el) => {
                            const totalGolsElem = $el.find('span:contains("Total de gols")');
                            if (totalGolsElem.length > 0) {
                                const marcadosDiv = $el.find('.UGvDX.ubOdK.WtEci.FfVOu.seFhp');
                                time1GolsMarcados += parseInt(marcadosDiv.eq(0).find('span').text());
                                time2GolsMarcados += parseInt(marcadosDiv.eq(1).find('span').text());
                            }

                            const golsSofridosElem = $el.find('span:contains("Gols sofridos")');
                            if (golsSofridosElem.length > 0) {
                                const sofridosDiv = $el.find('.UGvDX.ubOdK.WtEci.FfVOu.seFhp');
                                time1GolsSofridos += parseInt(sofridosDiv.eq(0).find('span').text());
                                time2GolsSofridos += parseInt(sofridosDiv.eq(1).find('span').text());
                            }
                        }).then(() => {
                            const mediaGolsMarcadosTime1 = time1GolsMarcados / jogosTime1;
                            const mediaGolsSofridosTime1 = time1GolsSofridos / jogosTime1;
                            const mediaGolsMarcadosTime2 = time2GolsMarcados / jogosTime2;
                            const mediaGolsSofridosTime2 = time2GolsSofridos / jogosTime2;

                            const mediaTotal = (mediaGolsMarcadosTime1 + mediaGolsSofridosTime1 + mediaGolsMarcadosTime2 + mediaGolsSofridosTime2) / 2;

                            const calcularProbabilidade = (mediaTotal, tipo) => {
                                if (tipo === '2+') {
                                    return mediaTotal >= 4 ? 100 : (mediaTotal / 4) * 100;
                                } else if (tipo === '1+') {
                                    return mediaTotal >= 2 ? 100 : (mediaTotal / 2) * 100; // Exemplo para 1 ou mais gols
                                }
                            };

                            let probabilidade2Mais = calcularProbabilidade(mediaTotal, '2+');
                            let probabilidade1Mais = calcularProbabilidade(mediaTotal, '1+');

                            // Se a probabilidade for 100%, substitui por um número aleatório entre 89 e 93
                            if (probabilidade2Mais === 100) {
                                probabilidade2Mais = Math.floor(Math.random() * (93 - 89 + 1)) + 89;
                            }
                            if (probabilidade1Mais === 100) {
                                probabilidade1Mais = Math.floor(Math.random() * (93 - 89 + 1)) + 89;
                            }

                            cy.log(`Média de Gols Marcados pelo ${time1}: ${mediaGolsMarcadosTime1.toFixed(2)}`);
                            cy.log(`Média de Gols Sofridos pelo ${time1}: ${mediaGolsSofridosTime1.toFixed(2)}`);
                            cy.log(`Média de Gols Marcados pelo ${time2}: ${mediaGolsMarcadosTime2.toFixed(2)}`);
                            cy.log(`Média de Gols Sofridos pelo ${time2}: ${mediaGolsSofridosTime2.toFixed(2)}`);
                            cy.log(`Média Total: ${mediaTotal.toFixed(2)}`);
                            cy.log(`Probabilidade de sair 2 ou mais gols: ${probabilidade2Mais.toFixed(2)}%`);
                            cy.log(`Probabilidade de sair 1 ou mais gols: ${probabilidade1Mais.toFixed(2)}%`);

                            const message2Mais = `
<b>CAMPEONATO BRASILEIRO - SÉRIE B</b>                            
<b>Jogo:</b> ${time1} x ${time2}
<b>Horário:</b> ${horario}

<b>Média de Gols Marcados pelo <u>${time1}</u>:</b> ${mediaGolsMarcadosTime1.toFixed(2)}
<b>Média de Gols Sofridos pelo <u>${time1}</u>:</b> ${mediaGolsSofridosTime1.toFixed(2)}
<b>Média de Gols Marcados pelo <u>${time2}</u>:</b> ${mediaGolsMarcadosTime2.toFixed(2)}
<b>Média de Gols Sofridos pelo <u>${time2}</u>:</b> ${mediaGolsSofridosTime2.toFixed(2)}
<b>Média Total:</b> ${mediaTotal.toFixed(2)}

<b>Probabilidade de sair + 1.5 gols:</b> <u>${probabilidade2Mais.toFixed(2)}%</u>
`;

                            const message1Mais = `
<b>CAMPEONATO BRASILEIRO - SÉRIE B</b>                            
<b>Jogo:</b> ${time1} x ${time2}
<b>Horário:</b> ${horario}

<b>Média de Gols Marcados pelo <u>${time1}</u>:</b> ${mediaGolsMarcadosTime1.toFixed(2)}
<b>Média de Gols Sofridos pelo <u>${time1}</u>:</b> ${mediaGolsSofridosTime1.toFixed(2)}
<b>Média de Gols Marcados pelo <u>${time2}</u>:</b> ${mediaGolsMarcadosTime2.toFixed(2)}
<b>Média de Gols Sofridos pelo <u>${time2}</u>:</b> ${mediaGolsSofridosTime2.toFixed(2)}
<b>Média Total:</b> ${mediaTotal.toFixed(2)}

<b>Probabilidade de sair + 0.5 gols:</b> <u>${probabilidade1Mais.toFixed(2)}%</u>
`;

                            if (probabilidade2Mais >= 60) {
                                chatIds.forEach(id => {
                                    cy.request({
                                        method: 'POST',
                                        url: `https://api.telegram.org/bot${telegramToken}/sendMessage`,
                                        body: {
                                            chat_id: id,
                                            text: message2Mais,
                                            parse_mode: 'HTML'
                                        }
                                    }).then((response) => {
                                        if (response.status === 200) {
                                            console.log(`Mensagem enviada para o chat ${id}`);
                                        } else {
                                            console.error(`Erro ao enviar mensagem para o chat ${id}:`, response);
                                        }
                                    });
                                });
                            } else if (probabilidade1Mais >= 80) {
                                chatIds.forEach(id => {
                                    cy.request({
                                        method: 'POST',
                                        url: `https://api.telegram.org/bot${telegramToken}/sendMessage`,
                                        body: {
                                            chat_id: id,
                                            text: message1Mais,
                                            parse_mode: 'HTML'
                                        }
                                    }).then((response) => {
                                        if (response.status === 200) {
                                            console.log(`Mensagem enviada para o chat ${id}`);
                                        } else {
                                            console.error(`Erro ao enviar mensagem para o chat ${id}:`, response);
                                        }
                                    });
                                });
                            } else {
                                cy.log(`Probabilidades abaixo dos limites: 2+ ${probabilidade2Mais.toFixed(2)}%, 1+ ${probabilidade1Mais.toFixed(2)}%`);
                            }
                        });
                    });
                });
            });
        });
    });
});
