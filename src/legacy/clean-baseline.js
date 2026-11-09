const colipetsFreshStartKey="colipets_clean_excel_baseline_v1";
        if(localStorage.getItem(colipetsFreshStartKey)!=="1"){for(const k of Object.keys(localStorage)){if((k.startsWith("taller_")||k.startsWith("colipets_"))&&k!==colipetsFreshStartKey)localStorage.removeItem(k);}localStorage.setItem(colipetsFreshStartKey,"1");}
    
