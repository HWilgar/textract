import copyIconSrc from "./img/copy-w.png";
import downloadIconSrc from "./img/download-w2.png";
import expandIconSrc from "./img/expand-arrows-w.png";
import minimizeIconSrc from "./img/minimize-arrows-w.png";
import removeIconSrc from "./img/close-w.png";

document.addEventListener('DOMContentLoaded', function() {

  const dropArea = document.querySelector('#drop-zone');
  const container = document.querySelector('#img-container');

  const howtoModal = document.querySelector("#howto-container");
  const howtoButton = document.querySelector("#howto-btn");
  const closeHowto = document.querySelector('#close-howto');

  const cropModal = document.querySelector("#crop-container");
  const closeCropModal = document.querySelector('#close-crop');
  const cropArea = document.querySelector('#cropArea');
  const cropButton = document.querySelector('#cropButton');
  const resizeHandles = document.querySelectorAll('.resizeHandle');
  
  let isResizing = false;
  let isMoving = false;
  let startX, startY, startWidth, startHeight, startLeft, startTop;
  let currentHandle = null;

  let lastClickedDiv = null; 
  let unconvertedImages = 0;

  //  Drop and Drag
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, unhighlight, false);
  });

  dropArea.addEventListener('drop', handleDrop, false);

  function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
  }

  function highlight(e) {
      dropArea.classList.add('dragover');
  }

  function unhighlight(e) {
      dropArea.classList.remove('dragover');
  }

  function handleDrop(e) {
      let dt = e.dataTransfer;
      let files = dt.files;
      handleFiles(files);

  }

  function handleFiles(files) {
      ([...files]).forEach(uploadFile);
  }

  const textarea = document.createElement('textarea');
  const resultDiv = document.querySelector('#result');

  //  Browse Files
  document.querySelector('#img-upload').addEventListener('change', function(e) {
    const files = e.target.files;

    const container = document.querySelector('#img-container');
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        uploadFile(file);
    }

  });

  //  Upload Files
  function uploadFile(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
          const fileName = file.name;
          const fileType = file.type;
          const src = e.target.result;
          createFileEntry(fileName, fileType, src);
          toggleHide();
      };
      reader.readAsDataURL(file);
  }

  //  Convert Button  
  document.querySelector('#convert-btn').addEventListener('click', async function() {
    const divContainers = document.querySelectorAll('.img-preview');
    const convertBtn = document.querySelector('#convert-btn');
    const text = convertBtn.querySelector('.convert-text');
    convertBtn.disabled = true;
    text.textContent = 'Converting...';

    for (const div of divContainers) {

      const img = div.querySelector('img');
      const imageSrc = img.src;

        if (img && !div.hasAttribute('converted') && !div.hasAttribute('invalid')) {
          unconvertedImages--;
          const id = div.id.replace('image', '');
          const progressBar = document.createElement('div');
          progressBar.id = 'progress-bar'+id;
          progressBar.classList.add('progress-bar');

          const bar = document.createElement('span');
          bar.classList.add('bar');

          const progress = document.createElement('span');
          progress.classList.add('progress');

          bar.appendChild(progress);
          progressBar.appendChild(bar);

          const imgContent = document.querySelector(`#img-content${id}`);
          const message = imgContent.querySelector('.uploaded');
          message.remove();
          imgContent.appendChild(progressBar);

          await sendImageToVisionAPI(imageSrc, id);
      }
    }

    convertBtn.disabled = false;
    text.textContent = 'Convert';
    toggleHide();
 });

  //  Convert Image to Text
  async function sendImageToVisionAPI(base64Image, currentImage) {
    // const apiKey = 'QUl6YVN5Qnk5NjF5alNyNnVxM21RTGZKaEhzbVZVWXlTY0hFdDc4';
    const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${atob(process.env.apiKey)}`;

    const requestBody = {
      requests: [
      {
          image: {
            content: base64Image.split(',')[1]
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION'
            }
          ]
      }
      ]
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();

      resultDiv.innerHTML = '';

      if (data.responses && data.responses.length > 0) {
        const annotations = data.responses[0].textAnnotations;

        if (annotations && annotations.length > 0) {
          contentBoard(currentImage, annotations);
        } else {
          noTextDetected(currentImage);
        } 
        const progressBar = document.querySelector('#progress-bar'+currentImage);
        progressBar.remove();
        
      } else {
        resultDiv.textContent = 'Error processing the image.';
      }

    } catch (error) {
      conversionFail(currentImage);
      }
  }

  //  Create uploaded item entries
  function createFileEntry(fileName, fileType, src){
    const id = Date.now();
    const imgContent = document.createElement('div');
    imgContent.id = `img-content${id}`;
    imgContent.className = 'img-content-wrap';

    const img = document.createElement('img');
    img.className = 'img-selected';
    img.setAttribute('uploaded', 'true');
    img.draggable = false;
    img.src = src;

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'img-wrapper';
    imgWrapper.id = `container${id}`;
    imgWrapper.addEventListener('click', () => selectedContainer(id));

    const fileNameDiv = document.createElement('div');
    const fileNameHolder = document.createElement('span');
    fileNameDiv.className = 'file-name';
    fileNameDiv.id = `file-name${id}`;
    let imageName = fileName;

    if (imageName.length > 31){
      imageName = limitFilename(fileName);
    }

    fileNameHolder.textContent = imageName;
    fileNameDiv.appendChild(fileNameHolder);
    imgContent.appendChild(fileNameDiv);

    const preview = document.createElement('div');
    preview.className = 'img-preview';
    preview.id = `image${id}`;
    preview.appendChild(img);

    
    imgWrapper.appendChild(preview);
    imgWrapper.appendChild(imgContent);

    if (container.firstChild) {
      container.insertBefore(imgWrapper, container.firstChild);
    } else {
      container.appendChild(imgWrapper);
    }

    isValidFile(fileType, preview, imgContent, src, id);

    const removeDiv = removeBtn(id);
    imgWrapper.appendChild(removeDiv);
  }

  //  Check file validity
  function isValidFile(fileType, preview, imgContent, src, id){
    const isImage = fileType.startsWith('image/');
    const message = document.createElement('span');
    console.log(isImage);
    if(!isImage){
      console.log("invalid");
      preview.setAttribute('invalid', 'true');
      message.className = 'error';
      message.textContent = 'Invalid file.';
      imgContent.appendChild(message);
    }else{
        unconvertedImages++;

        const crop = document.createElement('span');
        crop.textContent = 'crop';
        preview.appendChild(crop);
        preview.classList.add('crop');

        message.className = 'uploaded';
        message.textContent = 'File uploaded.';
        imgContent.appendChild(message);
        preview.addEventListener('click', function() {
          croppingModal(src);
        });
    }
  }

  //  format file name display
  function limitFilename(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    const firstPart = filename.substring(0, 15);
    const lastPart = filename.length > 10 ? filename.substring(filename.length - 10) : '';
    return firstPart + '...' + lastPart;
  }

  //  display identifier to selected item
  function selectedContainer(id) {
    const selectedContainer = document.querySelector(`#container${id}`);

    if (lastClickedDiv && lastClickedDiv !== selectedContainer) {
        lastClickedDiv.classList.toggle('shadow');
    } else if (selectedContainer === null || selectedContainer === undefined){
      return;
    }

    selectedContainer.classList.add('shadow');
    lastClickedDiv = selectedContainer;
  }

  //  Image converted
  function uploadContent(id, content){
    const img = document.querySelector(`#image${id}`);
    img.setAttribute('converted', 'true');

    const textarea = document.createElement('textarea');
    textarea.innerHTML = content;
    textarea.style.resize = 'none';
    return textarea;
  }

  //  Text Detection Error
  function noTextDetected(id){
    const img = document.querySelector(`#image${id}`);
    img.setAttribute('converted', 'true');

    const errorMsg = document.createElement('span');
    errorMsg.textContent = 'No text detected.';
    const imgContent = document.querySelector(`#img-content${id}`);
    imgContent.appendChild(errorMsg);
  }

  //  Conversion Fail Error
  function conversionFail(id){
    const img = document.querySelector(`#image${id}`);
    img.setAttribute('converted', 'true');

    const errorMsg = document.createElement('span');
    errorMsg.textContent = 'Failed to convert. Check Internet Connection.';
    const imgContent = document.querySelector(`#img-content${id}`);
    imgContent.appendChild(errorMsg);

    const progressBar = document.querySelector('#progress-bar'+id);
    progressBar.remove();
  }

  //  Create items buttons
  function contentBoard(id, annotations){
    const content = annotations[0].description;
    const btnWrap = document.createElement('div');
    btnWrap.className = 'btn-wrapper';

    const textarea = uploadContent(id, content);
    const copyAll = copyAllBtn(id, btnWrap);
    const download = downloadBtn(id, btnWrap);
    const expand = expandBtn(id, btnWrap);

    const imgContent = document.querySelector(`#img-content${id}`);
    imgContent.appendChild(textarea);
    textarea.id = 'textarea'+id;
    
    btnWrap.appendChild(download);
    btnWrap.appendChild(copyAll);
    btnWrap.appendChild(expand);
    
    const title = document.querySelector(`#file-name${id}`);
    title.classList.add('img-header');
    title.appendChild(btnWrap);

    const remove = document.querySelector(`#remove${id}`);
    const removeDiv = remove.parentNode;
    removeDiv.classList.add('move-top');
  }

  //  Create copy all button
  function copyAllBtn(id){
    const copyAll = document.createElement('button');
    copyAll.setAttribute('name', 'copy-btn');
    copyAll.setAttribute('id', `copy${id}`);
    copyAll.classList.add('copy-btn', 'tooltip');
    const copyImg = document.createElement('img');
    copyImg.src = copyIconSrc; 
    copyImg.alt = 'Copy All'; 
    copyAll.appendChild(copyImg);
    const tooltipCopy = document.createElement('span');
    tooltipCopy.className = 'tooltiptext';
    tooltipCopy.textContent = 'Copy';
    copyAll.appendChild(tooltipCopy);
    copyAll.addEventListener('click', function() {
      copyAllText(id);
    });
    return copyAll;
  }

  //  copy all items
  function copyAllText(id) {
    const text = document.querySelector(`#textarea${id}`).value;

    navigator.clipboard.writeText(text).then(function() {
    }).catch(function(err) {
      alert('Failed to copy text: ', err);
    });
    
    copiedAnimation(id);
  }

  //  copied animation
  function copiedAnimation(id){
    const button = document.querySelector(`#copy${id}`);
    const img = button.querySelector('img');
    img.className = 'tick-img';
    img.style.animation = 'none';
    void img.offsetWidth;
    img.style.animation = 'checkAnimation 0.5s ease-out forwards';
    img.style.display = 'block';
    img.src = 'img/tick-w.png'; 

    setTimeout(function(id) {
        img.src = 'img/copy-w.png'; 
    }, 1000);
  }

  //  create download button
  function downloadBtn(id){
    const download = document.createElement('button');
    download.setAttribute('name', 'dload-btn');
    download.setAttribute('id', `dload${id}`);
    download.classList.add('download-btn', 'tooltip');
    const downloadImg = document.createElement('img');
    downloadImg.src = downloadIconSrc; 
    downloadImg.alt = 'Download Text FIle'; 
    download.appendChild(downloadImg);
    const tooltipDownload = document.createElement('span');
    tooltipDownload.className = 'tooltiptext';
    tooltipDownload.textContent = 'Download';
    download.appendChild(tooltipDownload);
    download.addEventListener('click', function() {
      downloadTextFile(id);
    });
    return download;
  }

  //  create text file for download button
  function downloadTextFile(id) {
    const textContent = document.querySelector(`#textarea${id}`).value;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'text_document.txt';
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
  }

  //  create expand button
  function expandBtn(id){
    const expand = document.createElement('button');
    expand.setAttribute('name', 'expand-btn');
    expand.setAttribute('id', `expand${id}`);
    expand.classList.add('expand-btn', 'tooltip');
    const expandImg = document.createElement('img');
    expandImg.src = expandIconSrc; 
    expandImg.alt = 'Expand'; 
    expand.appendChild(expandImg);
    const tooltipExpand = document.createElement('span');
    tooltipExpand.className = 'tooltiptext';
    tooltipExpand.textContent = 'Expand';
    expand.appendChild(tooltipExpand);
    expand.addEventListener('click', function() {
      expandTextArea(id);
    });
    return expand;
  }

  //  expanding and minimizing text area
  function expandTextArea(id){
    const textarea = document.querySelector(`#textarea${id}`);
    const expandMinimizeBtn = document.querySelector(`#expand${id}`);
    const img = expandMinimizeBtn.querySelector('img');
    const tooltip = expandMinimizeBtn.querySelector('.tooltiptext');
    if (textarea.scrollHeight <= textarea.clientHeight && textarea.scrollHeight <= 70){
    return;
    }
    else if (textarea.style.height === '70px' || textarea.style.height === '') {
      textarea.style.height = 'auto'; 
      textarea.style.height = textarea.scrollHeight + 'px';
      img.src = minimizeIconSrc; 
      tooltip.textContent = 'Minimize';

    } else {
        textarea.style.height = '70px';
        img.src = expandIconSrc; 
        tooltip.textContent = 'Expand';
    }
  } 

  //  create remove button
  function removeBtn(id){
    const remove = document.createElement('button');
    remove.setAttribute('name', 'remove-btn');
    remove.setAttribute('id', `remove${id}`);
    remove.classList.add('remove-btn', 'tooltip');
    const removeImg = document.createElement('img');
    removeImg.src = removeIconSrc; 
    removeImg.alt = 'Remove file'; 
    remove.appendChild(removeImg);
    const tooltip = document.createElement('span');
    tooltip.className = 'tooltiptext';
    tooltip.textContent = 'Remove';
    remove.appendChild(tooltip);
    remove.addEventListener('click', function() {
      removeFile(id);
    });
    const removeDiv = document.createElement('div');
    removeDiv.className = 'remove-wrapper';
    removeDiv.appendChild(remove);
    return removeDiv
  }

  //  remove item
  function removeFile(id) {
    const divToRemove = document.querySelector(`#container${id}`);
    const imgDiv = document.querySelector(`#image${id}`);
    const isInvalid = imgDiv.getAttribute('invalid');
    const isConverted = imgDiv.getAttribute('converted');
    const errorMsg = document.querySelector('#result');
    if (!isConverted && !isInvalid){
      unconvertedImages--;
    }

    if (divToRemove) {
      if(lastClickedDiv !== null){
        lastClickedDiv.classList.remove('shadow');
        lastClickedDiv = null;
      }
        divToRemove.remove();
    }

    errorMsg.textContent = '';
    toggleHide();
  }

  //  hide convert button
  function toggleHide(){
    const convertBtn = document.querySelector('.convert-btn');
    const tooltip = convertBtn.querySelector('.tooltiptext-error');

    if (unconvertedImages === 0){
      if (tooltip.classList.contains('hidden')) {
        tooltip.classList.toggle('hidden');
      }

      convertBtn.disabled = true;

    }else{
      if (convertBtn.classList.contains('hidden')) {
        convertBtn.classList.toggle('hidden');
      }

      if (!(tooltip.classList.contains('hidden'))) {
        tooltip.classList.toggle('hidden');
      }

      convertBtn.disabled = false;
    }
  }

  //  How to Use Modal
  howtoButton.addEventListener('click', function() {
    howtoModal.style.display = "block";
  });

  closeHowto.addEventListener('click', function() {
    howtoModal.style.display = "none";
  });

  window.addEventListener('click', function(event) {
    if (event.target == howtoModal) {
      howtoModal.style.display = "none";
    }
  });

  //  Crop Modal
  closeCropModal.addEventListener('click', function() {
    removeCropImage();
  });

  window.addEventListener('click', function(event) {
    if (event.target == cropModal) {
      removeCropImage();
    }
  });

  //  Set crop modal
  function croppingModal(src){
    cropArea.style.width = '75%';
    cropArea.style.height = '75%';
    cropArea.style.left = '20px';
    cropArea.style.top = '20px';


    const img = document.createElement('img');
    img.className = 'img-selected';
    img.setAttribute('uploaded', 'true');
    img.draggable = false;
    img.src = src;
    img.id = 'imageToCrop';

    const container = document.querySelector('.image-to-crop-container');
    container.addEventListener('touchmove', preventTouchMove);
    container.insertBefore(img, container.firstChild);
    cropModal.style.display = "block";
  }

  //  Reset Crop Modal
  function removeCropImage(){
    cropModal.style.display = "none";
    const container = document.querySelector('.image-to-crop-container');
    const image = document.querySelector('#imageToCrop');
    container.removeChild(image);
    container.removeEventListener('touchmove', preventTouchMove);
  }

  //  Crop Image
  cropArea.addEventListener("touchstart", handleEvent);
  cropArea.addEventListener("mousedown", handleEvent);

  function preventTouchMove(event) {
    event.preventDefault();
  }

  function handleEvent(event) {
    if (event.type.startsWith("touch")) {
      handleTouchEvent(event);
    } else if (event.type.startsWith("mouse")) {
      handleMouseEvent(event);
    }
  }

  function handleMouseEvent(event) {
    if (event.target === cropArea) {
      isMoving = true;
      startX = event.clientX - cropArea.offsetLeft;
      startY = event.clientY - cropArea.offsetTop;
      document.addEventListener('mousemove', moveCropArea);
      document.addEventListener('mouseup', stopMoving);
    }
  };

  function handleTouchEvent(event) {
    if (event.target === cropArea) {
      isMoving = true;
      startX = event.touches[0].clientX - cropArea.offsetLeft;
      startY = event.touches[0].clientY - cropArea.offsetTop;
      document.addEventListener('touchmove', moveCropArea);
      document.addEventListener('touchend', stopMoving);
    }
  };

  function moveCropArea(event) {
    if (event.type.startsWith("touch")) {
      if (isMoving) {
        const x = event.touches[0].clientX - startX;
        const y = event.touches[0].clientY - startY;
        cropArea.style.left = x + 'px';
        cropArea.style.top = y + 'px';
      }
    } else if (event.type.startsWith("mouse")) {
      if (isMoving) {
        const x = event.clientX - startX;
        const y = event.clientY - startY;
        cropArea.style.left = x + 'px';
        cropArea.style.top = y + 'px';
      }
    }
  }

  function stopMoving(event) {
    if (event.type.startsWith("touch")) {
      isMoving = false;
      document.removeEventListener('touchmove', moveCropArea);  // Corrected typo
      document.removeEventListener('touchend', stopMoving);     // Corrected typo
    } else if (event.type.startsWith("mouse")) {
      isMoving = false;
      document.removeEventListener('mousemove', moveCropArea);
      document.removeEventListener('mouseup', stopMoving);
    }
  }

  resizeHandles.forEach(handle => {
    handle.addEventListener("touchstart", resizeHandleEvent);
    handle.addEventListener("mousedown", resizeHandleEvent);

    function resizeHandleEvent(event) {
      // Check if the event is a touch event
      if (event.type.startsWith("touch")) {
        isResizing = true;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        startWidth = cropArea.offsetWidth;
        startHeight = cropArea.offsetHeight;
        startLeft = cropArea.offsetLeft;
        startTop = cropArea.offsetTop;
        currentHandle = this;
        document.addEventListener('touchmove', resizeCropArea);
        document.addEventListener('touchend', stopResizing);
      } else if (event.type.startsWith("mouse")) {
        isResizing = true;
        startX = event.clientX;
        startY = event.clientY;
        startWidth = cropArea.offsetWidth;
        startHeight = cropArea.offsetHeight;
        startLeft = cropArea.offsetLeft;
        startTop = cropArea.offsetTop;
        currentHandle = this;
        document.addEventListener('mousemove', resizeCropArea);
        document.addEventListener('mouseup', stopResizing);
      }
    }
  });

  function resizeCropArea(event) {
    if (isResizing && currentHandle) {
      let dx;
      let dy;
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (event.type.startsWith("touch")) {
        dx = event.touches[0].clientX - startX;
        dy = event.touches[0].clientY - startY;
      } else if (event.type.startsWith("mouse")) {
        dx = event.clientX - startX;
        dy = event.clientY - startY;
      }

      if (currentHandle.classList.contains('topLeft')) {
          newWidth = startWidth - dx;
          newHeight = startHeight - dy;
          cropArea.style.width = newWidth + 'px';
          cropArea.style.height = newHeight + 'px';
          cropArea.style.left = (startLeft + dx) + 'px';
          cropArea.style.top = (startTop + dy) + 'px';
      } else if (currentHandle.classList.contains('topRight')) {
          newWidth = startWidth + dx;
          newHeight = startHeight - dy;
          cropArea.style.width = newWidth + 'px';
          cropArea.style.height = newHeight + 'px';
          cropArea.style.top = (startTop + dy) + 'px';
      } else if (currentHandle.classList.contains('bottomLeft')) {
          newWidth = startWidth - dx;
          newHeight = startHeight + dy;
          cropArea.style.width = newWidth + 'px';
          cropArea.style.height = newHeight + 'px';
          cropArea.style.left = (startLeft + dx) + 'px';
      } else if (currentHandle.classList.contains('bottomRight')) {
          newWidth = startWidth + dx;
          newHeight = startHeight + dy;
          cropArea.style.width = newWidth + 'px';
          cropArea.style.height = newHeight + 'px';
      }
    }
  }

  function stopResizing(event) {
    if (event.type.startsWith("touch")) {
      isResizing = false;
      currentHandle = null;
      document.removeEventListener('touchmove', resizeCropArea);
      document.removeEventListener('touchend', stopResizing);

    } else if (event.type.startsWith("mouse")) {
      isResizing = false;
      currentHandle = null; 
      document.removeEventListener('mousemove', resizeCropArea);
      document.removeEventListener('mouseup', stopResizing);
    }
  }

//  Crop the image when the button is clicked
  cropButton.addEventListener('click', function() {
    const image = document.querySelector('#imageToCrop');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    //  Calculate the scaling factor
    const scaleX = image.naturalWidth / image.offsetWidth;
    const scaleY = image.naturalHeight / image.offsetHeight;

    //  Adjust the cropping area based on the scaling factor
    const adjustedCropArea = {
        left: (cropArea.offsetLeft - image.offsetLeft) * scaleX,
        top: (cropArea.offsetTop - image.offsetTop) * scaleY,
        width: cropArea.offsetWidth * scaleX,
        height: cropArea.offsetHeight * scaleY
    };

    //  Set the canvas dimensions to the adjusted cropped area size
    canvas.width = adjustedCropArea.width;
    canvas.height = adjustedCropArea.height;

    //  Draw the cropped area on the canvas
    context.drawImage(image, adjustedCropArea.left, adjustedCropArea.top, adjustedCropArea.width, adjustedCropArea.height, 0, 0, adjustedCropArea.width, adjustedCropArea.height);

    //  Convert the canvas to a data URL
    const fileName =`Crop${Date.now()}.png`;
    const fileType = 'image/png';
    const croppedImageDataURL = canvas.toDataURL('image/png');

    //  Display the cropped image
    const croppedImage = document.createElement('img');
    croppedImage.src = croppedImageDataURL;
    createFileEntry(fileName, fileType, croppedImageDataURL, container);
    toggleHide();
    removeCropImage();
  });
});
