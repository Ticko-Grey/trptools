const audioendpoint = 'https://api.hyra.io/audio/'

async function handleFileSelect() {
    let promise = new Promise(function(resolve){
        document.body.onfocus = function() {
            let files = $('#fileInput').prop('files');
            if (!files[0]) {

                setTimeout(() => {
                    let files = $('#fileInput').prop('files');
                    if (!files) {
                        resolve(false)
                    } else {
                        resolve(files[0])
                    }
                }, 500);

            } else {
                resolve(files[0]) 
            }  
        }
    });
    return promise
}

async function input(type, data) {
    switch(type) {
        case 'sound':
            try {
                const netRes = await fetch(audioendpoint + data)
                if (netRes.status != 200) {return false}
                const reader = await netRes.arrayBuffer();
                const audioPlayer = $('#audioPlayer')[0]

                var blob = new Blob([reader], { type: 'audio/mp3' });
                var url = window.URL.createObjectURL(blob)

                audioPlayer.src = url;
                audioPlayer.play();

                return true
            } catch {
                return false
            }
        case 'file':
            $('#fileInput').click();
            const res = await handleFileSelect()
            if (res) {
                const audioPlayer = $('#audioPlayer')[0]
                const url = window.URL.createObjectURL(res);
                audioPlayer.src = url;
                audioPlayer.play();
                return true  
            } else {
                return false
            } 
    }
}