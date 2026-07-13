case 'SOSICODEX': {
  try {
    await sock.sendMessage(m.chat, { text: "Tunggu sebentar, sedang mengambil data number..." }, { quoted: m });
    const response = await axios.get('https://api.synoxcloud.xyz/tools/virtual-numbers');
    if (!response || !response.data || !response.data.result || !response.data.result.numbers) {
      return sock.sendMessage(m.chat, { text: "Gagal mengambil data, tidak ada response atau server sedang down." }, { quoted: m });
    }
    const allNumbers = response.data.result.numbers;
    if (!Array.isArray(allNumbers) || allNumbers.length === 0) {
      return sock.sendMessage(m.chat, { text: "Stok nomor dari API sedang kosong." }, { quoted: m });
    }
    const randomIndex = Math.floor(Math.random() * allNumbers.length);
    const selectedData = allNumbers[randomIndex];
    if (!selectedData) {
      return sock.sendMessage(m.chat, { text: "Failed gacha number, try again." }, { quoted: m });
    }
    const nomor = selectedData.number;
    const negara = selectedData.country || "null country";
    const bendera = selectedData.flag || "";
    if (!nomor) {
      return sock.sendMessage(m.chat, { text: "Format nomor tidak ditemukan dalam data API." }, { quoted: m });
    }

    let txt = `𝐆𝐚𝐜𝐡𝐚 𝐍𝐨𝐤𝐨𝐬 𝐖𝐡𝐚𝐭𝐬𝐀𝐩𝐩 🪀🎲 
 - Number : ${nomor}
 - Country : ${negara} ${bendera}
`;

    const initialMenu = {
      interactiveMessage: {
        title: txt,
        footer: "Menunggu OTP masuk, akan otomatis terkirim jika ditemukan... (5 menit)",
        thumbnail: "https://avatars.githubusercontent.com/u/250146879?v=4",
        nativeFlowMessage: {
          messageParamsJson: JSON.stringify({
            limited_time_offer: {
              text: "R-XYZ || Tools Gacha Nokwa",
              url: "https://api.synoxcloud.xyz",
              copy_code: nomor,
              expiration_time: Date.now() * 999
            }
          }),
          buttons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "🔄 Gacha Lagi",
                id: `${prefix}gachanokos`
              })
            }
          ]
        }
      }
    };

    await sock.sendMessage(m.chat, initialMenu, { quoted: m });

    const otpCheckerUrl = (number) => `https://api.synoxcloud.xyz/tools/otp-checker?number=${encodeURIComponent(number)}`;
    let otpFound = false;
    let attempts = 0;
    const maxAttempts = 30; 
    const interval = 10000; 

    const pollInterval = setInterval(async () => {
      attempts++;
      try {
        const otpRes = await axios.get(otpCheckerUrl(nomor));
        const resData = otpRes.data;

        if (resData.status && resData.result && resData.result.total > 0) {
          clearInterval(pollInterval);
          clearTimeout(timeoutTimer);
          if (!otpFound) {
            otpFound = true;

            let otpTxt = `Ressult OTP \"${nomor}\" 📥 
 - Nomor : ${nomor}\n
 - Status : ${resData.message}\n
 - Total OTP : ${resData.result.total}\n`;
            if (resData.result.otps && resData.result.otps.length > 0) {
              otpTxt += `\n*Daftar OTP:* \n`;
              resData.result.otps.forEach((otp, i) => {
                otpTxt += `${i + 1}. ${otp}\n`;
              });
            } else {
              otpTxt += `\n_Belum ada OTP baru yang masuk._\n`;
            }

            const otpMenu = {
              interactiveMessage: {
                title: otpTxt,
                footer: "R-XYZ || Tools Gacha Nokwa",
                thumbnail: "https://avatars.githubusercontent.com/u/250146879?v=4",
                nativeFlowMessage: {
                  messageParamsJson: JSON.stringify({
                    limited_time_offer: {
                      text: "Check OTP",
                      url: "https://api.synoxcloud.xyz",
                      copy_code: nomor,
                      expiration_time: Date.now() * 999
                    }
                  }),
                  buttons: [
                    {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: "🔄 Gacha Lagi",
                        id: `${prefix}gachanokos`
                      })
                    }
                  ]
                }
              }
            };

            await sock.sendMessage(m.chat, otpMenu, { quoted: m });
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          clearTimeout(timeoutTimer);
          if (!otpFound) {
            otpFound = true; 
            const noOtpMenu = {
              interactiveMessage: {
                title: `❌ Tidak ditemukan kode OTP untuk nomor ${nomor} dalam 5 menit.`,
                footer: "Silakan gacha ulang untuk mendapatkan nomor baru.",
                thumbnail: "https://avatars.githubusercontent.com/u/250146879?v=4",
                nativeFlowMessage: {
                  messageParamsJson: JSON.stringify({
                    limited_time_offer: {
                      text: "R-XYZ || Tools Gacha Nokwa",
                      url: "https://api.synoxcloud.xyz",
                      copy_code: nomor,
                      expiration_time: Date.now() * 999
                    }
                  }),
                  buttons: [
                    {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: "🔄 Gacha Lagi",
                        id: `${prefix}gachanokos`
                      })
                    }
                  ]
                }
              }
            };
            await sock.sendMessage(m.chat, noOtpMenu, { quoted: m });
          }
        }
      } catch (pollErr) {
        console.error("Error saat polling OTP:", pollErr);
      }
    }, interval);

    const timeoutTimer = setTimeout(() => {
      clearInterval(pollInterval);
      if (!otpFound) {
        if (!otpFound) {
          otpFound = true;
          const noOtpMenu = {
            interactiveMessage: {
              title: `❌ Tidak ditemukan kode OTP untuk nomor ${nomor} dalam 5 menit.`,
              footer: "Silakan gacha ulang untuk mendapatkan nomor baru.",
              thumbnail: "https://avatars.githubusercontent.com/u/250146879?v=4",
              nativeFlowMessage: {
                messageParamsJson: JSON.stringify({
                  limited_time_offer: {
                    text: "R-XYZ || Tools Gacha Nokwa",
                    url: "https://api.synoxcloud.xyz",
                    copy_code: nomor,
                    expiration_time: Date.now() * 999
                  }
                }),
                buttons: [
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "🔄 Gacha Lagi",
                      id: `${prefix}gachanokos`
                    })
                  }
                ]
              }
            }
          };
          await sock.sendMessage(m.chat, noOtpMenu, { quoted: m });
        }
      }
    }, 300000); // 5 menit

  } catch (error) {
    console.error(error);
    await sock.sendMessage(m.chat, { text: "Terjadi kesalahan saat menghubungi server API Virtual Numbers." }, { quoted: m });
  }
}
break;
