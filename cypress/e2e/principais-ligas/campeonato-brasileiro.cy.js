import dayjs from 'dayjs';
import locale from 'dayjs/locale/pt-br'; // Importa a localidade em português do Brasil

dayjs.locale(locale); // Define a localidade

describe('Cálculo de Probabilidade de Gols no Campeonato Brasileiro', () => {
    const telegramToken = '8024146594:AAF7_cVi3by_5eYbYjOji9VnC-TFCayFVgM'; // Substitua pelo seu token
    const chatIds = [
        '6617740232',
        '-4519143208',
        //'6662950862',
    ];

    beforeEach(() => {
        cy.visit('https://www.espn.com.br/futebol/calendario/_/liga/bra.1', { timeout: 300000 });
    });

    it('Deve calcular a probabilidade de sair 2 ou mais gols em cada jogo', () => {
        const diaAtual = dayjs().format('dddd, D [de] MMMM, YYYY'); // Formata a data para o português

        cy.contains(diaAtual).then(($dia) => {
            const jogosHoje = $dia.closest('.ScheduleTables').find('.Table__TR--sm');

            // Verificar se há jogos
            const numJogos = jogosHoje.length; // Armazena o número de jogos

            if (numJogos === 0) {
                cy.log(`Não há jogos programados para ${diaAtual}.`);
                return; // Sai do teste se não houver jogos
            }

            Cypress._.times(numJogos, (i) => {
                const $jogo = jogosHoje.eq(i); // Pega o jogo da posição i

                const time1 = $jogo.find('.Table__Team.away a').text().trim(); // Nome do primeiro time
                const time2 = $jogo.find('.Table__Team:not(.away) a').text().trim(); // Nome do segundo time
                const jogoLink = $jogo.find('.local a').attr('href'); // Link para a página do jogo

                // Acesse a página do jogo
                cy.visit(`https://www.espn.com.br${jogoLink}`, { timeout: 300000 }).then(() => {
                    let jogosTime1 = 0;
                    let jogosTime2 = 0;
                    let time1GolsMarcados = 0;
                    let time1GolsSofridos = 0;
                    let time2GolsMarcados = 0;
                    let time2GolsSofridos = 0;

                    cy.get('h2.ScoreCell__TeamName').then(($h2s) => {
                        // Captura os registros dos times
                        const recordTime1 = $h2s.eq(0).closest('.Gamestrip__TeamContent').find('.Gamestrip__Record').text();
                        const recordTime2 = $h2s.eq(1).closest('.Gamestrip__TeamContent').find('.Gamestrip__Record').text();

                        // Função para somar os números
                        const somaJogos = (record) => {
                            const numeros = record.split(',')[0].split('-').map(Number);
                            return numeros.reduce((acc, num) => acc + num, 0);
                        };

                        // Calcula os jogos de cada time
                        jogosTime1 = somaJogos(recordTime1);
                        jogosTime2 = somaJogos(recordTime2);

                        cy.get('.LOSQp.Kiog.TSdsN.lEHQF.Pxeau.FOePw.nbAEp').each(($el) => {
                            // Verifica se a div contém "Total de gols"
                            const totalGolsElem = $el.find('span:contains("Total de gols")');
                            if (totalGolsElem.length > 0) {
                                // Captura os gols marcados
                                const marcadosDiv = $el.find('.UGvDX.ubOdK.WtEci.FfVOu.seFhp');
                                time1GolsMarcados += parseInt(marcadosDiv.eq(0).find('span').text());
                                time2GolsMarcados += parseInt(marcadosDiv.eq(1).find('span').text());
                            }

                            // Verifica se a div contém "Gols sofridos"
                            const golsSofridosElem = $el.find('span:contains("Gols sofridos")');
                            if (golsSofridosElem.length > 0) {
                                // Captura os gols sofridos
                                const sofridosDiv = $el.find('.UGvDX.ubOdK.WtEci.FfVOu.seFhp');
                                time1GolsSofridos += parseInt(sofridosDiv.eq(0).find('span').text());
                                time2GolsSofridos += parseInt(sofridosDiv.eq(1).find('span').text());
                            }
                        }).then(() => {
                            // Calcular as médias
                            const mediaGolsMarcadosTime1 = time1GolsMarcados / jogosTime1;
                            const mediaGolsSofridosTime1 = time1GolsSofridos / jogosTime1;
                            const mediaGolsMarcadosTime2 = time2GolsMarcados / jogosTime2;
                            const mediaGolsSofridosTime2 = time2GolsSofridos / jogosTime2;

                            // Calcular a média total de gols
                            const mediaTotal = (mediaGolsMarcadosTime1 + mediaGolsSofridosTime1 + mediaGolsMarcadosTime2 + mediaGolsSofridosTime2) / 2;

                            // Calcular a probabilidade
                            let probabilidade;
                            if (mediaTotal >= 4) {
                                probabilidade = 100;
                            } else {
                                probabilidade = (mediaTotal / 4) * 100; // Proporcional
                            }

                            // Log das médias e da probabilidade
                            cy.log(`Média de Gols Marcados pelo ${time1}: ${mediaGolsMarcadosTime1.toFixed(2)}`);
                            cy.log(`Média de Gols Sofridos pelo ${time1}: ${mediaGolsSofridosTime1.toFixed(2)}`);
                            cy.log(`Média de Gols Marcados pelo ${time2}: ${mediaGolsMarcadosTime2.toFixed(2)}`);
                            cy.log(`Média de Gols Sofridos pelo ${time2}: ${mediaGolsSofridosTime2.toFixed(2)}`);
                            cy.log(`Média Total: ${mediaTotal.toFixed(2)}`);
                            cy.log(`Probabilidade de sair 2 ou mais gols: ${probabilidade.toFixed(2)}%`);

                            // Mensagem a ser enviada
                            const message = `
<b>CAMPEONATO BRASILEIRO - SÉRIE A</b>                            
<b>Jogo:</b> ${time1} x ${time2}

<b>Média de Gols Marcados pelo <u>${time1}</u>:</b> ${mediaGolsMarcadosTime1.toFixed(2)}
<b>Média de Gols Sofridos pelo <u>${time1}</u>:</b> ${mediaGolsSofridosTime1.toFixed(2)}
<b>Média de Gols Marcados pelo <u>${time2}</u>:</b> ${mediaGolsMarcadosTime2.toFixed(2)}
<b>Média de Gols Sofridos pelo <u>${time2}</u>:</b> ${mediaGolsSofridosTime2.toFixed(2)}

<b>Média Total:</b> ${mediaTotal.toFixed(2)}
<b>Probabilidade de sair 2 ou mais gols:</b> <u>${probabilidade.toFixed(2)}%</u>
`;

                            // Verificar se a probabilidade é 60% ou mais
                            if (probabilidade >= 60) {
                                chatIds.forEach(id => {
                                    cy.request({
                                        method: 'POST',
                                        url: `https://api.telegram.org/bot${telegramToken}/sendMessage`,
                                        body: {
                                            chat_id: id, // Aqui você envia o chat_id atual do loop
                                            text: message,
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
                                cy.log(`Probabilidade menor que 60% para o jogo ${time1} x ${time2}: ${probabilidade.toFixed(2)}%`);
                            }
                        });
                    });
                });
            });
        });
    });            
});
