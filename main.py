from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Form
from typing import Optional
import pandas as pd
import numpy as np
import json
import ast
import io
from datetime import timedelta, datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import os
import os
import pandas as pd
from datetime import datetime, timedelta


#  =====================================================
#  MONGODB CONNECTION
#  =====================================================
MONGO_URI = os.getenv("MONGO_URI", "mongodb://192.168.2.11:27017")
DB_NAME = os.getenv("DB_NAME", "zeon_db")
CP_COLLECTION_NAME = os.getenv("CP_COLLECTION_NAME", "cp_details")

# Initialize MongoDB client
try:
    print(f"🔌 Connecting to MongoDB at: {MONGO_URI}")
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test connection
    mongo_client.admin.command('ping')
    print(f"✅ Successfully connected to MongoDB")
    
    # Get database and collection
    db = mongo_client[DB_NAME]
    cp_collection = db[CP_COLLECTION_NAME]
    session_collection = db["session_data"]

    # Create index on Charge Point id for faster queries
    cp_collection.create_index("Charge Point id")
    session_collection.create_index(
        [("cp_id", 1), ("connector_id", 1), ("session_start_time", 1)],
        unique=True,
    )
    print(f"✅ MongoDB collection '{CP_COLLECTION_NAME}' ready")
    
    # Check if collection has data
    cp_count = cp_collection.count_documents({})
    print(f"📊 Current CP records in MongoDB: {cp_count}")
    
except (ConnectionFailure, ServerSelectionTimeoutError) as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
    print(f"⚠️  Please ensure MongoDB is running at {MONGO_URI}")
    mongo_client = None
    db = None
    cp_collection = None
    session_collection = None
except Exception as e:
    print(f"❌ Unexpected error connecting to MongoDB: {e}")
    mongo_client = None
    db = None
    cp_collection = None
    session_collection = None

#  =====================================================
#  FASTAPI APP
#  =====================================================

app = FastAPI(title="ZEON Backend API", version="1.0.0")

origins = [
	"http://192.168.2.11:5173",
	"http://localhost:5173",
	"*",
]

app.add_middleware(
   CORSMiddleware,
   allow_origins=["http://localhost:3000", "http://localhost:5173", "http://192.168.2.11:8000", "http://192.168.2.11:5173"],
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],
)

@app.get("/")
async def root():
   return {"message": "Welcome to ZEON Backend API"}

@app.get("/health")
async def health_check():
   return {"status": "healthy"}


#  =====================================================
#  CP DETAILS DEBUG ENDPOINT (NEW)
#  =====================================================
@app.get("/debug/cp-details")
async def debug_cp_details():
    """
    Debug endpoint to verify cp_details collection and session_data cp_id mapping.
    Returns sample data to help diagnose OEM/Station chart issues.
    """
    try:
        result = {
            "cp_collection_status": "connected" if cp_collection is not None else "disconnected",
            "session_collection_status": "connected" if session_collection is not None else "disconnected",
            "cp_details_count": 0,
            "session_data_count": 0,
            "sample_cp_details": [],
            "sample_session_cp_ids": [],
            "matching_test": {}
        }
        
        # Check cp_details collection
        if cp_collection is not None:
            result["cp_details_count"] = cp_collection.count_documents({})
            
            # Get sample cp_details records
            sample_cp = list(cp_collection.find({}, {
                "_id": 0,
                "Charge Point id": 1,
                "OEM Name": 1,
                "Station Alias Name": 1,
                "Connector Standard(AC/DC)": 1
            }).limit(5))
            
            result["sample_cp_details"] = [
                {
                    "cp_id": str(doc.get("Charge Point id", "")).strip(),
                    "cp_id_raw": doc.get("Charge Point id"),
                    "oem": doc.get("OEM Name", "Unknown"),
                    "station": doc.get("Station Alias Name", "Unknown"),
                    "type": doc.get("Connector Standard(AC/DC)", "Unknown")
                }
                for doc in sample_cp
            ]
        
        # Check session_data collection
        if session_collection is not None:
            result["session_data_count"] = session_collection.count_documents({})
            
            # Get unique cp_ids from recent sessions
            pipeline = [
                {"$sort": {"session_start_time": -1}},
                {"$limit": 100},
                {"$group": {"_id": "$cp_id"}},
                {"$limit": 10}
            ]
            
            unique_cp_ids = list(session_collection.aggregate(pipeline))
            result["sample_session_cp_ids"] = [
                {
                    "cp_id": str(doc["_id"]).strip() if doc["_id"] else None,
                    "cp_id_raw": doc["_id"],
                    "cp_id_type": str(type(doc["_id"]).__name__)
                }
                for doc in unique_cp_ids
            ]
            
            # Test matching
            if len(result["sample_session_cp_ids"]) > 0 and len(result["sample_cp_details"]) > 0:
                test_session_cpid = result["sample_session_cp_ids"][0]["cp_id"]
                test_cp_detail_cpid = result["sample_cp_details"][0]["cp_id"]
                
                # Find if this session cp_id exists in cp_details
                matched = any(
                    cp["cp_id"] == test_session_cpid 
                    for cp in result["sample_cp_details"]
                )
                
                result["matching_test"] = {
                    "session_cp_id_sample": test_session_cpid,
                    "cp_details_cp_id_sample": test_cp_detail_cpid,
                    "sample_match_found": matched,
                    "note": "If sample_match_found is False, there's a data mismatch between session_data.cp_id and cp_details.'Charge Point id'"
                }
        
        return JSONResponse(content=result)
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "message": "Error checking CP details"}
        )


#  =====================================================
#  UPDATE CP REPORT ENDPOINT
#  =====================================================
# @app.post("/update-cp-report")
# async def update_cp_report(file: UploadFile = File(...)):
#     """
#     Update CP (Charge Point) details by uploading a new report file.
#     Data is stored in MongoDB instead of in-memory DataFrame.
    
#     Parameters:
#     - file: Excel (.xlsx, .xls) or CSV (.csv) file containing updated CP details
    
#     Returns:
#     - Success message with count of records loaded
#     - Updated CP details statistics
    
#     Example:
#     - Upload cp_report-20_12_2025_9_02_AM.xlsx to update all CP details
#     """
    
#     # Check MongoDB connection
#     if cp_collection is None:
#         raise HTTPException(
#             status_code=503,
#             detail="MongoDB is not connected. Please ensure MongoDB is running at mongodb://localhost:27017"
#         )
    
#     try:
#         # Read uploaded file
#         contents = await file.read()
#         ext = file.filename.split('.')[-1].lower()
        
#         print(f"📤 Received CP report upload: {file.filename}")
#         print(f"📊 File size: {len(contents) / 1024:.2f} KB")
        
#         # Parse file based on extension
#         if ext == 'csv':
#             new_cp_df = pd.read_csv(io.BytesIO(contents))
#             print(f"✅ Parsed CSV file")
#         elif ext in ['xlsx', 'xls']:
#             new_cp_df = pd.read_excel(io.BytesIO(contents))
#             print(f"✅ Parsed Excel file")
#         else:
#             raise HTTPException(
#                 status_code=400, 
#                 detail=f"Unsupported file format: .{ext}. Please upload .xlsx, .xls, or .csv file"
#             )
        
#         # Validate that it looks like a CP report
#         required_columns = ['Charge Point id']
#         missing_columns = [col for col in required_columns if col not in new_cp_df.columns]
        
#         if missing_columns:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Invalid CP report format. Missing required columns: {missing_columns}. "
#                        f"Available columns: {new_cp_df.columns.tolist()}"
#             )
        
#         # Get old record count from MongoDB
#         old_record_count = cp_collection.count_documents({})
        
#         # Clear existing CP details in MongoDB
#         if old_record_count > 0:
#             delete_result = cp_collection.delete_many({})
#             print(f"🗑️  Deleted {delete_result.deleted_count} old CP records from MongoDB")
        
#         # Convert DataFrame to list of dictionaries for MongoDB
#         cp_records = new_cp_df.to_dict('records')
        
#         # Insert new CP details into MongoDB
#         if len(cp_records) > 0:
#             insert_result = cp_collection.insert_many(cp_records)
#             new_record_count = len(insert_result.inserted_ids)
#             print(f"✅ Inserted {new_record_count} new CP records into MongoDB")
#         else:
#             new_record_count = 0
        
#         # Get unique CP IDs
#         unique_cp_ids = len(cp_collection.distinct("Charge Point id"))
        
#         # Get sample CP IDs
#         sample_records = list(cp_collection.find({}, {"Charge Point id": 1, "_id": 0}).limit(5))
#         sample_cp_ids = [rec.get("Charge Point id") for rec in sample_records if rec.get("Charge Point id")]
        
#         print(f"✅ CP details updated successfully in MongoDB!")
#         print(f"   Records: {old_record_count} → {new_record_count}")
#         print(f"   Unique CP IDs: {unique_cp_ids}")
        
#         # Return success response
#         return JSONResponse(content={
#             "status": "success",
#             "message": "CP details updated successfully in MongoDB",
#             "filename": file.filename,
#             "storage": "MongoDB",
#             "statistics": {
#                 "total_records": new_record_count,
#                 "unique_cp_ids": unique_cp_ids,
#                 "total_columns": len(new_cp_df.columns),
#                 "previous_record_count": old_record_count,
#                 "records_added": new_record_count - old_record_count
#             },
#             "columns": new_cp_df.columns.tolist(),
#             "sample_cp_ids": sample_cp_ids
#         })
        
#     except HTTPException:
#         # Re-raise HTTP exceptions
#         raise
#     except Exception as e:
#         print(f"❌ Error updating CP details: {e}")
#         raise HTTPException(
#             status_code=500, 
#             detail=f"Error updating CP report: {str(e)}"
#         )


#  =====================================================
#  GET CP DETAILS ENDPOINT (NEW - for viewing current data)
#  =====================================================
# @app.get("/cp-details")
# async def get_cp_details_info():
#     """
#     Get information about currently loaded CP details from MongoDB.
    
#     Returns:
#     - Statistics about loaded CP data
#     - Sample records
#     """
    
#     # Check MongoDB connection
#     if cp_collection is None:
#         return JSONResponse(content={
#             "status": "error",
#             "message": "MongoDB is not connected. Please ensure MongoDB is running at mongodb://localhost:27017",
#             "statistics": {
#                 "total_records": 0,
#                 "unique_cp_ids": 0,
#                 "total_columns": 0
#             }
#         })
    
#     try:
#         # Get total record count from MongoDB
#         total_records = cp_collection.count_documents({})
        
#         if total_records == 0:
#             return JSONResponse(content={
#                 "status": "no_data",
#                 "message": "No CP details in MongoDB. Please upload a CP report using /update-cp-report endpoint.",
#                 "storage": "MongoDB",
#                 "statistics": {
#                     "total_records": 0,
#                     "unique_cp_ids": 0,
#                     "total_columns": 0
#                 }
#             })
        
#         # Get unique CP IDs
#         unique_cp_ids = len(cp_collection.distinct("Charge Point id"))
        
#         # Get sample records (first 5)
#         sample_cursor = cp_collection.find({}, {"_id": 0}).limit(5)
#         sample_records = list(sample_cursor)
        
#         # Get all column names from first document
#         if sample_records:
#             columns = list(sample_records[0].keys())
#         else:
#             columns = []
        
#         # Filter sample records to show only key columns if they exist
#         key_columns = ['Charge Point id', 'Station Alias Name', 'OEM Name', 'Power (kW)', 'Firmware Version']
#         available_key_columns = [col for col in key_columns if col in columns]
        
#         if available_key_columns:
#             filtered_samples = []
#             for record in sample_records:
#                 filtered_record = {col: record.get(col) for col in available_key_columns}
#                 filtered_samples.append(filtered_record)
#             sample_records = filtered_samples
        
#         return JSONResponse(content={
#             "status": "success",
#             "message": "CP details loaded from MongoDB",
#             "storage": "MongoDB",
#             "statistics": {
#                 "total_records": total_records,
#                 "unique_cp_ids": unique_cp_ids,
#                 "total_columns": len(columns)
#             },
#             "columns": columns,
#             "sample_records": sample_records
#         })
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error retrieving CP details info from MongoDB: {str(e)}"
#         )


#  =====================================================
#  FILE PROCESS ENDPOINT
#  =====================================================

def get_combined_df(current_file_path):

    # -----------------------
    # 1. Extract filename
    # -----------------------
    filename = os.path.basename(current_file_path)

    # ocpp_100022_2026-03-04.csv
    name = filename.replace(".csv", "")
    parts = name.split("_")

    cpid = parts[1]
    date_str = parts[2]
    # -----------------------
    # 2. Convert date
    # -----------------------
    current_date = datetime.strptime(date_str, "%Y-%m-%d")
    prev_date = current_date - timedelta(days=1)

    # -----------------------
    # 3. Get processed folder
    # -----------------------
    processed_dir = current_file_path.split("/processed/")[0] + "/processed"

    # -----------------------
    # 4. Construct previous file path
    # -----------------------
    prev_path = os.path.join(
        processed_dir,
        prev_date.strftime("%Y"),
        prev_date.strftime("%m"),
        prev_date.strftime("%d"),
        f"ocpp_{cpid}_{prev_date.strftime('%Y-%m-%d')}.csv"
    )

    print("Looking for:", prev_path)

    dfs = []

    # -----------------------
    # 5. Read previous file
    # -----------------------
    if os.path.exists(prev_path):
        print("Previous file found")
        prev_df = pd.read_csv(prev_path)
        dfs.append(prev_df)
    else:
        print("Previous day file not found")

    # -----------------------
    # 6. Read current file
    # -----------------------
    curr_df = pd.read_csv(current_file_path)
    dfs.append(curr_df)

    # -----------------------
    # 7. Combine
    # -----------------------
    combined_df = pd.concat(dfs, ignore_index=True)

    return combined_df



def process_filepath(filepath):
   """
   Process an OCPP log file by path (S3 format — rows reversed before processing)
   """
   try:
       if not os.path.exists(filepath):
           raise HTTPException(status_code=404, detail=f"File not found: {filepath}")

       ext = filepath.split('.')[-1].lower()

       if ext == 'csv':
           df = get_combined_df(filepath)
       elif ext in ['xlsx', 'xls']:
           df = get_combined_df(filepath)
       else:
           raise HTTPException(status_code=400, detail="Unsupported file format")

       print(f"📊 File: {filepath}")
       print(f"📊 Available columns: {df.columns.tolist()}")
       print(f"📊 DataFrame shape: {df.shape}")

       # S3 data: reverse row order
       df = df.iloc[::-1].reset_index(drop=True)

       result = final_process(df)

       # parse JSON strings → objects
       for c in range(1, 7):
           result[f"Connector{c}"] = json.loads(result[f"Connector{c}"])
       result["info"] = json.loads(result["info"]) if isinstance(result["info"], str) else result["info"]

       # sanitize numpy / NaN / Inf
       result = json_safe(result)

       # Save session data to MongoDB (one document per session)
       if session_collection is not None:
           try:
               cp_id = str(df['cp_id'].iloc[0]) if 'cp_id' in df.columns and len(df) > 0 else None
               now = datetime.now()
               session_docs = []
               for connector_id in range(1, 7):
                   sessions = result.get(f"Connector{connector_id}", [])
                   for session in (sessions if isinstance(sessions, list) else []):
                       session_docs.append({
                           "cp_id": cp_id,
                           "connector_id": connector_id,
                           "uploaded_at": now,
                           **session,
                       })
               for doc in session_docs:
                   session_collection.replace_one(
                       {
                           "cp_id": doc["cp_id"],
                           "connector_id": doc["connector_id"],
                           "session_start_time": doc.get("session_start_time"),
                       },
                       doc,
                       upsert=True,
                   )
               print(f"✅ {len(session_docs)} session(s) upserted to MongoDB for cp_id={cp_id}")
           except Exception as e:
               print(f"⚠️  Failed to save session data to MongoDB: {e}")

       return JSONResponse(content=result)

   except ValueError as e:
       raise HTTPException(status_code=400, detail=str(e))
   except Exception as e:
       raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


#  =====================================================
#  SESSION REPORT ENDPOINT
#  =====================================================
@app.get("/session-report")
async def session_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    cp_id: Optional[str] = Query(None, description="CP ID"),
    s_n: Optional[str] = Query(None, description="Station Alias Name (partial match)"),
    oem: Optional[str] = Query(None, description="OEM Name (partial match)"),
):
    """
    Build a summary report from stored session_data.
    All five params are optional filters — omit any to widen the result.
    """
    try:
        if session_collection is None:
            raise HTTPException(status_code=503, detail="MongoDB not connected")

        date_filter = {}

        # Date range filter
        if start_date or end_date:
            date_filter["session_start_time"] = {}
            if start_date:
                date_filter["session_start_time"]["$gte"] = start_date
            if end_date:
                date_filter["session_start_time"]["$lte"] = end_date + " 23:59:59"

        # If s_n or oem provided, resolve matching cp_ids from cp_details
        if (s_n or oem) and cp_collection is not None:
            cp_filter = {}
            if s_n:
                cp_filter["Station Alias Name"] = {"$regex": s_n, "$options": "i"}
            if oem:
                cp_filter["OEM Name"] = {"$regex": oem, "$options": "i"}
            matched_cps = cp_collection.distinct("Charge Point id", cp_filter)
            if not matched_cps:
                return JSONResponse(content={
                    "total_sessions": 0, "cp_ids": [],
                    **{f"report_connector{c}": {} for c in range(1, 7)},
                })
            if cp_id:
                matched_cps = [c for c in matched_cps if c == cp_id]
            date_filter["cp_id"] = {"$in": matched_cps}
        elif cp_id:
            date_filter["cp_id"] = cp_id

        docs = list(session_collection.find(date_filter, {"_id": 0}))

        if not docs:
            return JSONResponse(content={
                "total_sessions": 0,
                "cp_ids": [],
                **{f"report_connector{c}": {} for c in range(1, 7)},
            })

        df = pd.DataFrame(docs)

        # Parse all_errors from stored string back to list
        if "all_errors" in df.columns:
            def parse_errors(val):
                if isinstance(val, list):
                    return val
                try:
                    return ast.literal_eval(str(val))
                except Exception:
                    return []
            df["all_errors"] = df["all_errors"].apply(parse_errors)

        # Cast numeric columns
        numeric_cols = [
            "is_Preparing", "is_Auto_Start", "is_REMOTE_Start", "is_RFID_Start",
            "is_Charging", "session_energy_delivered_kwh", "session_duration_minutes",
            "Power.Active.Import", "session_peak_power_kw",
        ]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        cp_ids = sorted(df["cp_id"].dropna().unique().tolist()) if "cp_id" in df.columns else []

        # Split by connector and build reports for all connectors
        connector_reports = {}
        for c in range(1, 7):
            conn_df = df[df["connector_id"].astype(str) == str(c)].copy()
            connector_reports[c] = json_safe(build_summary(conn_df))

        return JSONResponse(content={
            "start_date": start_date,
            "end_date": end_date,
            "cp_ids": cp_ids,
            "total_sessions": len(docs),
            **{f"report_connector{c}": connector_reports[c] for c in range(1, 7)},
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


#  =====================================================
#  DASHBOARD ENDPOINT
#  =====================================================
@app.get("/dashboard")
async def dashboard(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    cp_id: Optional[str] = Query(None, description="CP ID filter"),
    s_n: Optional[str] = Query(None, description="Station Alias Name (partial match)"),
    oem: Optional[str] = Query(None, description="OEM Name (partial match)"),
    connector_type: Optional[str] = Query(None, description="AC, DC, or Combined"),
):
    """
    Unified dashboard endpoint returning all aggregated metrics for charting.
    Supports optional filters: date range, cp_id, station name, OEM, connector type.
    """
    try:
        if session_collection is None:
            raise HTTPException(status_code=503, detail="MongoDB not connected")

        # --------------------------------------------------
        # 1. Build CP lookup map: cp_id -> {oem_name, station_name, connector_std}
        # --------------------------------------------------
        cp_lookup = {}
        if cp_collection is not None:
            print("\n🔍 Building CP lookup from cp_details collection...")
            cp_docs = list(cp_collection.find({}, {
                "_id": 0,
                "Charge Point id": 1,
                "OEM Name": 1,
                "Station Alias Name": 1,
                "Connector Standard(AC/DC)": 1,
            }))
            
            print(f"📊 Found {len(cp_docs)} CP records in cp_details collection")
            
            for doc in cp_docs:
                cid = doc.get("Charge Point id")
                if cid is None:
                    continue
                    
                # Convert to string and strip whitespace for consistent matching
                cid_str = str(cid).strip()
                
                cp_lookup[cid_str] = {
                    "oem_name": doc.get("OEM Name", "Unknown"),
                    "station_name": doc.get("Station Alias Name", "Unknown"),
                    "connector_std": doc.get("Connector Standard(AC/DC)", "Unknown"),
                }
            
            print(f"✅ Built CP lookup with {len(cp_lookup)} unique CP IDs")
            if len(cp_lookup) > 0:
                # Show sample mapping
                sample_items = list(cp_lookup.items())[:3]
                print(f"📋 Sample CP mappings:")
                for cpid, details in sample_items:
                    print(f"   - CP {cpid}: OEM='{details['oem_name']}', Station='{details['station_name']}'")
        else:
            print("⚠️ WARNING: cp_collection is None - CP details not available")

        # --------------------------------------------------
        # 2. Build session query filter
        # --------------------------------------------------
        query = {}

        if start_date or end_date:
            query["session_start_time"] = {}
            if start_date:
                query["session_start_time"]["$gte"] = start_date
            if end_date:
                query["session_start_time"]["$lte"] = end_date + " 23:59:59"

        if cp_id:
            query["cp_id"] = cp_id

        if (s_n or oem) and cp_collection is not None:
            cp_filter = {}
            if s_n:
                cp_filter["Station Alias Name"] = {"$regex": s_n, "$options": "i"}
            if oem:
                cp_filter["OEM Name"] = {"$regex": oem, "$options": "i"}
            matched_cp_ids = cp_collection.distinct("Charge Point id", cp_filter)
            if not matched_cp_ids:
                return JSONResponse(content=_empty_dashboard_response())
            if cp_id:
                matched_cp_ids = [c for c in matched_cp_ids if c == cp_id]
            query["cp_id"] = {"$in": matched_cp_ids}

        # --------------------------------------------------
        # 3. Fetch sessions
        # --------------------------------------------------
        docs = list(session_collection.find(query, {"_id": 0}))
        if not docs:
            print("⚠️ No sessions found matching query")
            return JSONResponse(content=_empty_dashboard_response())

        print(f"\n📊 Fetched {len(docs)} session records from database")
        
        df = pd.DataFrame(docs)
        
        # Debug: Show unique cp_ids in session data
        if "cp_id" in df.columns:
            unique_cp_ids = df["cp_id"].unique()
            print(f"📋 Found {len(unique_cp_ids)} unique CP IDs in session data")
            sample_cp_ids = [str(x).strip() for x in unique_cp_ids[:5] if pd.notna(x)]
            print(f"   Sample session CP IDs: {sample_cp_ids}")

        for col in ["is_Charging", "is_Preparing", "is_Auto_Start", "is_REMOTE_Start", "is_RFID_Start",
                    "session_energy_delivered_kwh", "session_peak_power_kw", "Power.Active.Import",
                    "session_duration_minutes"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # --------------------------------------------------
        # 4. Attach OEM, station, connector_type from cp_lookup
        # --------------------------------------------------
        def _lookup(cp_id_val, field):
            if pd.isna(cp_id_val):
                return "Unknown"
            # Convert to string and strip whitespace for matching
            cp_id_clean = str(cp_id_val).strip()
            result = cp_lookup.get(cp_id_clean, {}).get(field, "Unknown")
            return result

        if "cp_id" in df.columns:
            print("\n🔗 Mapping CP IDs to OEM/Station names...")
            df["oem_name"] = df["cp_id"].apply(lambda x: _lookup(x, "oem_name"))
            df["station_name"] = df["cp_id"].apply(lambda x: _lookup(x, "station_name"))
            df["connector_std"] = df["cp_id"].apply(lambda x: _lookup(x, "connector_std"))
            
            # Debug: Check mapping success rate
            total_sessions = len(df)
            unknown_oem = (df["oem_name"] == "Unknown").sum()
            unknown_station = (df["station_name"] == "Unknown").sum()
            
            matched_sessions = total_sessions - unknown_oem
            match_rate = (matched_sessions / total_sessions * 100) if total_sessions > 0 else 0
            
            print(f"✅ CP Mapping Results:")
            print(f"   - Total sessions: {total_sessions}")
            print(f"   - Successfully mapped: {matched_sessions} ({match_rate:.1f}%)")
            print(f"   - Unknown OEM: {unknown_oem}")
            print(f"   - Unknown Station: {unknown_station}")
            
            # Show sample of mapped data
            if matched_sessions > 0:
                sample_mapped = df[df["oem_name"] != "Unknown"].head(2)
                print(f"\n📋 Sample mapped sessions:")
                for idx, row in sample_mapped.iterrows():
                    print(f"   - CP {row['cp_id']}: OEM='{row['oem_name']}', Station='{row['station_name']}'")
            
            # If no matches, show debugging info
            if matched_sessions == 0:
                print("\n⚠️ WARNING: No CP IDs matched!")
                print("   Checking for mismatch issues...")
                if len(cp_lookup) > 0 and len(df) > 0:
                    sample_session_cpid = str(df["cp_id"].iloc[0]).strip()
                    sample_lookup_cpid = list(cp_lookup.keys())[0]
                    print(f"   Session CP ID example: '{sample_session_cpid}' (type: {type(df['cp_id'].iloc[0])})")
                    print(f"   Lookup CP ID example: '{sample_lookup_cpid}' (type: {type(sample_lookup_cpid)})")
                    print(f"   Do they match? {sample_session_cpid == sample_lookup_cpid}")
        else:
            print("⚠️ WARNING: 'cp_id' column not found in session data")
            df["oem_name"] = "Unknown"
            df["station_name"] = "Unknown"
            df["connector_std"] = "Unknown"

        # --------------------------------------------------
        # 5. Apply connector_type filter
        # --------------------------------------------------
        if connector_type and connector_type.upper() not in ("COMBINED", "ALL"):
            ct = connector_type.upper()
            df = df[df["connector_std"].str.upper().str.contains(ct, na=False)]

        if df.empty:
            return JSONResponse(content=_empty_dashboard_response())

        # --------------------------------------------------
        # 6. Derived columns
        # --------------------------------------------------
        # Note: Negative = Charging sessions where stop != "Successful"
        # This includes: "Failed / Error", "Incomplete", null, and any other non-successful values
        def _is_negative(row):
            stop = row.get("stop")
            is_charging = row.get("is_Charging", 0)
            # Only count negatives for charging sessions (is_Charging == 1)
            if is_charging != 1:
                return 0
            # Any stop value that is NOT "Successful" is negative
            return 0 if stop == "Successful" else 1

        df["is_negative"] = df.apply(_is_negative, axis=1).astype(int)
        # Pre-charging uses is_Preparing flag (not is_Charging == 0)
        df["is_precharging_fail"] = (df["is_Preparing"].fillna(0) == 1).astype(int)
        df["is_charging_fail"] = (
            (df["is_Charging"].fillna(0) == 1) & (df["stop"] == "Failed / Error")
        ).astype(int)
        df["is_incomplete"] = (df["stop"] == "Incomplete").astype(int)

        # --------------------------------------------------
        # 7. Filter options
        # --------------------------------------------------
        filter_options = {
            "oems": sorted(df["oem_name"].dropna().unique().tolist()),
            "stations": sorted(df["station_name"].dropna().unique().tolist()),
            "cpids": sorted(df["cp_id"].dropna().unique().tolist()) if "cp_id" in df.columns else [],
        }

        # --------------------------------------------------
        # 8. Metrics helper
        # --------------------------------------------------
        def _compute_metrics(sub):
            total = len(sub)
            if total == 0:
                return {
                    "totalSessions": 0, "chargingSessions": 0, "positiveSessions": 0, "negativeSessions": 0,
                    "prechargingFailures": 0, "networkPerformance": 0.0,
                    "totalEnergy": 0.0, "avgSessionDuration": 0.0, "peakPower": 0.0,
                }
            
            # Count charging sessions (is_Charging == 1)
            charging_sessions = int(sub["is_Charging"].fillna(0).sum())
            
            # Count positives: charging sessions with successful stop
            positive = int(
                ((sub["is_Charging"].fillna(0) == 1) & (sub["stop"] == "Successful")).sum()
            )
            
            # Count negatives: charging sessions with non-successful stop
            negative = int(sub["is_negative"].sum())
            
            # Count pre-charging: sessions with is_Preparing == 1
            precharging = int(sub["is_precharging_fail"].sum())
            
            total_energy = 0.0
            if "session_energy_delivered_kwh" in sub.columns:
                total_energy = round(pd.to_numeric(sub["session_energy_delivered_kwh"], errors="coerce").sum(), 2)
            avg_dur = 0.0
            if "session_duration_minutes" in sub.columns:
                vals = pd.to_numeric(sub["session_duration_minutes"], errors="coerce").dropna()
                if not vals.empty:
                    avg_dur = round(vals.mean(), 2)
            peak = 0.0
            if "session_peak_power_kw" in sub.columns:
                vals = pd.to_numeric(sub["session_peak_power_kw"], errors="coerce").dropna()
                if not vals.empty:
                    peak = round(vals.max(), 2)
            
            # Network performance: success rate of charging sessions only
            network_perf = round(positive / charging_sessions * 100, 2) if charging_sessions > 0 else 0.0
            
            return {
                "totalSessions": total,
                "chargingSessions": charging_sessions,
                "positiveSessions": positive,
                "negativeSessions": negative,
                "prechargingFailures": precharging,
                "networkPerformance": network_perf,
                "totalEnergy": total_energy,
                "avgSessionDuration": avg_dur,
                "peakPower": peak,
            }

        metrics = {"combined": _compute_metrics(df)}
        for c in range(0, 7):
            sub = df[df["connector_id"].astype(str) == str(c)] if "connector_id" in df.columns else pd.DataFrame()
            metrics[f"connector{c}"] = _compute_metrics(sub)

        # --------------------------------------------------
        # 9. Session trend (daily)
        # --------------------------------------------------
        session_trend = []
        if "session_start_time" in df.columns:
            df["_date"] = df["session_start_time"].astype(str).str[:10]
            trend = (
                df.groupby("_date")
                .agg(
                    peakPower=("session_peak_power_kw", lambda x: round(pd.to_numeric(x, errors="coerce").max() or 0, 2)),
                    avgPower=("session_peak_power_kw", lambda x: round(pd.to_numeric(x, errors="coerce").mean() or 0, 2)),
                    totalSessions=("is_negative", "count"),
                )
                .reset_index()
                .rename(columns={"_date": "date"})
                .sort_values("date")
            )
            session_trend = json_safe(trend.to_dict(orient="records"))

        # --------------------------------------------------
        # 10. Negative stops by OEM and station
        # --------------------------------------------------
        def _negative_by_group(group_col, field_name):
            rows = []
            if group_col not in df.columns:
                return rows
            for name, grp in df.groupby(group_col):
                total = len(grp)
                if total == 0:
                    continue
                # Count charging sessions only (is_Charging == 1)
                charging_sessions = int(grp["is_Charging"].fillna(0).sum())
                neg = int(grp["is_negative"].sum())
                # Calculate negative stop percentage based on charging sessions
                neg_pct = round(neg / charging_sessions * 100, 2) if charging_sessions > 0 else 0
                rows.append({
                    field_name: str(name),
                    "totalSessions": charging_sessions,  # Use charging sessions for consistency
                    "negativeStops": neg,
                    "negativeStopPercentage": neg_pct,
                })
            rows.sort(key=lambda x: x["negativeStopPercentage"], reverse=True)
            return rows

        network_performance = {
            "byOEM": _negative_by_group("oem_name", "oem"),
            "byStation": _negative_by_group("station_name", "station"),
        }
        
        print(f"\n📊 Network Performance Results:")
        print(f"   - OEM records: {len(network_performance['byOEM'])}")
        print(f"   - Station records: {len(network_performance['byStation'])}")
        if len(network_performance['byOEM']) > 0:
            print(f"   - Top 3 OEMs by Neg Stop%: ")
            for item in network_performance['byOEM'][:3]:
                print(f"      * {item['oem']}: {item['negativeStopPercentage']}%")
        if len(network_performance['byStation']) > 0:
            print(f"   - Top 3 Stations by Neg Stop%: ")
            for item in network_performance['byStation'][:3]:
                print(f"      * {item['station']}: {item['negativeStopPercentage']}%")

        # --------------------------------------------------
        # 11. Precharging failures by OEM and station
        # --------------------------------------------------
        def _precharging_by_group(group_col, field_name):
            rows = []
            if group_col not in df.columns:
                return rows
            pf = df[df["is_precharging_fail"] == 1]
            for name, grp in pf.groupby(group_col):
                rows.append({field_name: str(name), "count": len(grp)})
            rows.sort(key=lambda x: x["count"], reverse=True)
            return rows

        precharging_failures = {
            "byOEM": _precharging_by_group("oem_name", "oem"),
            "byStation": _precharging_by_group("station_name", "station"),
        }
        
        print(f"\n📊 Precharging Failures Results:")
        print(f"   - OEM records: {len(precharging_failures['byOEM'])}")
        print(f"   - Station records: {len(precharging_failures['byStation'])}")

        # --------------------------------------------------
        # 12. Error breakdown (top 10 vendor error codes)
        # --------------------------------------------------
        error_breakdown = []
        if "vendorErrorCode" in df.columns:
            err = df["vendorErrorCode"].dropna().astype(str)
            err = err[~err.isin(["", "None", "nan", "NoError", "Precharging Failure"])]
            if not err.empty:
                counts = err.value_counts()
                total_err = int(counts.sum())
                for code, cnt in counts.head(10).items():
                    error_breakdown.append({
                        "errorCode": code,
                        "count": int(cnt),
                        "percentage": round(int(cnt) / total_err * 100, 2),
                    })

        # --------------------------------------------------
        # 13. Auth method distribution
        # --------------------------------------------------
        auth_methods = []
        for method, col in [("Auto", "is_Auto_Start"), ("Remote", "is_REMOTE_Start"), ("RFID", "is_RFID_Start")]:
            cnt = int(df[col].fillna(0).sum()) if col in df.columns else 0
            if cnt > 0:
                auth_methods.append({"method": method, "value": cnt})

        # --------------------------------------------------
        # 14. Charging share by OEM
        # --------------------------------------------------
        charging_share = []
        if "oem_name" in df.columns:
            total_all = len(df)
            for name, grp in df.groupby("oem_name"):
                cnt = len(grp)
                charging_share.append({
                    "oem": str(name),
                    "value": cnt,
                    "percentage": round(cnt / total_all * 100, 2) if total_all > 0 else 0,
                })
            charging_share.sort(key=lambda x: x["value"], reverse=True)

        return JSONResponse(content=json_safe({
            "filterOptions": filter_options,
            "metrics": metrics,
            "sessionTrend": session_trend,
            "networkPerformance": network_performance,
            "prechargingFailures": precharging_failures,
            "errorBreakdown": error_breakdown,
            "authMethods": auth_methods,
            "chargingShare": charging_share,
        }))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating dashboard: {str(e)}")


def _empty_dashboard_response():
    empty_metrics = {
        "totalSessions": 0, "chargingSessions": 0, "positiveSessions": 0, "negativeSessions": 0,
        "prechargingFailures": 0, "networkPerformance": 0.0,
        "totalEnergy": 0.0, "avgSessionDuration": 0.0, "peakPower": 0.0,
    }
    return {
        "filterOptions": {"oems": [], "stations": [], "cpids": []},
        "metrics": {
            "combined": empty_metrics,
            **{f"connector{c}": empty_metrics for c in range(0, 7)},
        },
        "sessionTrend": [],
        "networkPerformance": {"byOEM": [], "byStation": []},
        "prechargingFailures": {"byOEM": [], "byStation": []},
        "errorBreakdown": [],
        "authMethods": [],
        "chargingShare": [],
    }


#  =====================================================
#  CPID RANKINGS ENDPOINT
#  =====================================================
@app.get("/dashboard/cpid-rankings")
async def cpid_rankings(
    oem: Optional[str] = Query(None, description="OEM name (partial match)"),
    station: Optional[str] = Query(None, description="Station name (partial match)"),
    connector_type: Optional[str] = Query(None, description="AC or DC"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
):
    """
    Returns all CPIDs ranked by negative stops, optionally filtered by OEM/station/connector type.
    """
    try:
        if session_collection is None:
            raise HTTPException(status_code=503, detail="MongoDB not connected")

        cp_lookup = {}
        if cp_collection is not None:
            for doc in cp_collection.find({}, {
                "_id": 0,
                "Charge Point id": 1,
                "OEM Name": 1,
                "Station Alias Name": 1,
                "Connector Standard(AC/DC)": 1,
            }):
                cid = str(doc.get("Charge Point id", ""))
                cp_lookup[cid] = {
                    "oem_name": doc.get("OEM Name", "Unknown"),
                    "connector_std": doc.get("Connector Standard(AC/DC)", "Unknown"),
                }

        query = {}
        if start_date or end_date:
            query["session_start_time"] = {}
            if start_date:
                query["session_start_time"]["$gte"] = start_date
            if end_date:
                query["session_start_time"]["$lte"] = end_date + " 23:59:59"

        if (oem or station) and cp_collection is not None:
            cp_filter = {}
            if oem:
                cp_filter["OEM Name"] = {"$regex": oem, "$options": "i"}
            if station:
                cp_filter["Station Alias Name"] = {"$regex": station, "$options": "i"}
            matched = cp_collection.distinct("Charge Point id", cp_filter)
            if not matched:
                return JSONResponse(content=[])
            query["cp_id"] = {"$in": matched}

        docs = list(session_collection.find(query, {"_id": 0, "cp_id": 1, "stop": 1, "is_Charging": 1}))
        if not docs:
            return JSONResponse(content=[])

        df = pd.DataFrame(docs)
        df["is_Charging"] = pd.to_numeric(df.get("is_Charging"), errors="coerce").fillna(0)

        if "cp_id" in df.columns:
            df["connector_std"] = df["cp_id"].apply(
                lambda x: cp_lookup.get(str(x), {}).get("connector_std", "Unknown")
            )

        if connector_type and connector_type.upper() not in ("COMBINED", "ALL"):
            ct = connector_type.upper()
            df = df[df["connector_std"].str.upper().str.contains(ct, na=False)]

        if df.empty:
            return JSONResponse(content=[])

        # Negative stops: charging sessions where stop != "Successful"
        def _is_negative(row):
            is_charging = row.get("is_Charging", 0)
            stop = row.get("stop")
            # Only count negatives for charging sessions
            if is_charging != 1:
                return 0
            # Any stop value that is NOT "Successful" is negative
            return 0 if stop == "Successful" else 1

        df["is_negative"] = df.apply(_is_negative, axis=1).astype(int)

        result = []
        for cpid, grp in df.groupby("cp_id"):
            # Only count charging sessions (is_Charging == 1)
            charging_sessions = int(grp["is_Charging"].sum())
            neg = int(grp["is_negative"].sum())
            result.append({
                "cpid": str(cpid),
                "chargingSessions": charging_sessions,
                "negativeStops": neg,
                "negativeStopPercentage": round(neg / charging_sessions * 100, 2) if charging_sessions > 0 else 0,
            })

        result.sort(key=lambda x: x["negativeStops"], reverse=True)
        return JSONResponse(content=json_safe(result))

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating CPID rankings: {str(e)}")


#  =====================================================
#  🔥 JSON SAFE SERIALIZER
#  =====================================================
def json_safe(obj):
   if isinstance(obj, (np.integer,)):
       return int(obj)

   if isinstance(obj, (np.floating, float)):
       if np.isnan(obj) or np.isinf(obj):
           return None
       return float(obj)

   if isinstance(obj, dict):
       return {k: json_safe(v) for k, v in obj.items()}

   if isinstance(obj, list):
       return [json_safe(v) for v in obj]

   return obj


def build_summary(df, idle_errors=None):
   # FIX: Check if DataFrame is empty first
   if df.empty:
       return {
           "Preparing Sessions": 0,
           "Charging Sessions": 0,
           "Successful Sessions": 0,
           "Failed / Error Stops": 0,
           "Incomplete Sessions": 0,
           "Successful Error Summary": {},
           "Failed / Error Error Summary": {},
           "Idle Time Errors": idle_errors if idle_errors else [],
           "Remote Start": 0,
           "Auto Start": 0,
           "RFID Start": 0,
           "Peak Power Delivered (kW)": 0,
           "Avg Power per Session (kW)": 0,
           "Total Energy Delivered (kWh)": 0,
           "Avg Session Duration (mins)": 0,
       }
   
   # FIX: Check if columns exist before accessing them
   # Clean Power column (handle None / NaN / strings)
   if 'Power.Active.Import' in df.columns:
       power_kw = (
           pd.to_numeric(df['Power.Active.Import'], errors='coerce')
           .dropna()
           / 1000
       )
   else:
       power_kw = pd.Series(dtype=float)

   # Calculate total energy delivered
   total_energy = 0
   if 'session_energy_delivered_kwh' in df.columns:
       total_energy = pd.to_numeric(df['session_energy_delivered_kwh'], errors='coerce').sum()

   # Calculate average session duration
   avg_duration = 0
   if 'session_duration_minutes' in df.columns:
       valid_durations = pd.to_numeric(df['session_duration_minutes'], errors='coerce').dropna()
       if len(valid_durations) > 0:
           avg_duration = round(valid_durations.mean(), 2)

   # Boolean masks for error summaries - check if columns exist
   if 'stop' in df.columns and 'all_errors' in df.columns:
       # NEW: Handle multiple errors per session (stored as lists of dicts with timestamps)
       successful_error_summary = {}
       failed_error_summary = {}
       
       success_mask = (df["stop"] == "Successful")
       failed_mask = (df["stop"] == "Failed / Error")
       
       # Count all errors for successful sessions
       for errors in df.loc[success_mask, 'all_errors'].dropna():
           if isinstance(errors, list):
               for error_dict in errors:
                   if isinstance(error_dict, dict):
                       # Extract all non-None error values from the dict (excluding timestamp)
                       for key, val in error_dict.items():
                           if key != 'timestamp' and val and val not in ["None", "NoError"]:
                               successful_error_summary[val] = successful_error_summary.get(val, 0) + 1
       
       # Count all errors for failed sessions
       for errors in df.loc[failed_mask, 'all_errors'].dropna():
           if isinstance(errors, list):
               for error_dict in errors:
                   if isinstance(error_dict, dict):
                       # Extract all non-None error values from the dict (excluding timestamp)
                       for key, val in error_dict.items():
                           if key != 'timestamp' and val and val not in ["None", "NoError"]:
                               failed_error_summary[val] = failed_error_summary.get(val, 0) + 1
       
       successful_sessions = int((df['stop'] == "Successful").sum())
       failed_sessions = int((df['stop'] == "Failed / Error").sum())
       incomplete_sessions = int((df['stop'] == "Incomplete").sum())
   else:
       successful_error_summary = {}
       failed_error_summary = {}
       successful_sessions = 0
       failed_sessions = 0
       incomplete_sessions = 0

   summary = {
       "Preparing Sessions": int(df['is_Preparing'].sum()) if 'is_Preparing' in df.columns else 0,
       "Charging Sessions": int(df['is_Charging'].sum()) if 'is_Charging' in df.columns else 0,
       "Successful Sessions": successful_sessions,
       "Failed / Error Stops": failed_sessions,
       "Incomplete Sessions": incomplete_sessions,
       "Successful Error Summary": successful_error_summary,
       "Failed / Error Error Summary": failed_error_summary,
       "Idle Time Errors": idle_errors if idle_errors else [],
       "Remote Start": int(df['is_REMOTE_Start'].sum()) if 'is_REMOTE_Start' in df.columns else 0,
       "Auto Start": int(df['is_Auto_Start'].sum()) if 'is_Auto_Start' in df.columns else 0,
       "RFID Start": int(df['is_RFID_Start'].sum()) if 'is_RFID_Start' in df.columns else 0,
       "Peak Power Delivered (kW)": round(power_kw.max(), 2) if not power_kw.empty else 0,
       "Avg Power per Session (kW)": round(power_kw.mean(), 2) if not power_kw.empty else 0,
       "Total Energy Delivered (kWh)": round(total_energy, 2),
       "Avg Session Duration (mins)": avg_duration,
   }

   return summary

def cp_details(cp_id):
    """
    Retrieve CP details from MongoDB.
    Returns a DataFrame for compatibility with existing code.
    """
    print(f"🔍 Looking up CP details for: {cp_id} in MongoDB")
    
    try:
        # Check if MongoDB is connected
        if cp_collection is None:
            print("⚠️ MongoDB not connected")
            return pd.DataFrame()
        
        # Query MongoDB for the CP ID
        result_doc = cp_collection.find_one({"Charge Point id": cp_id}, {"_id": 0})
        
        if result_doc is None:
            print(f"⚠️ No CP details found for CP ID: {cp_id}")
            return pd.DataFrame()
        
        # Convert to DataFrame
        result_df = pd.DataFrame([result_doc])
        
        # Select relevant columns (check if they exist first)
        desired_columns = ['Station Alias Name', 'Charge Point id', 'OEM Name', 'Power (kW)', 'Firmware Version', 'Connector Standard(AC/DC)']
        available_columns = [col for col in desired_columns if col in result_df.columns]
        
        if available_columns:
            result_df = result_df[available_columns]
        
        print(f"✅ Found CP details in MongoDB")
        return result_df
        
    except Exception as e:
        print(f"❌ Error retrieving CP details from MongoDB: {e}")
        return pd.DataFrame()

def date_details(date):
   return {"start_date":min(date), "end_date":max(date)}



def parse_ocpp_datetime(col):
   s = (
       col.astype(str)
          .str.replace(' IST', '', regex=False)
          .str.replace(',', '', regex=False)
          .str.strip()
   )

   dt = pd.to_datetime(
       s,
       format="mixed",
       dayfirst=True,
       errors="coerce"
   )
   return dt

def final_process(df):
   # FIX 1: Make a copy to avoid SettingWithCopyWarning
   df = df.copy()
   
   dt_real = parse_ocpp_datetime(df['real_time'])
   dt_recv = parse_ocpp_datetime(df['received_time'])

   # ---- Extract fields ----
   df['date'] = dt_real.dt.strftime('%d/%m/%Y')
   df['real_time'] = dt_real.dt.strftime('%H:%M:%S')
   df['received_time'] = dt_recv.dt.strftime('%H:%M:%S')
   
   # NEW: Keep full datetime for session timing
   df['real_datetime'] = dt_real

   cols = df.columns.tolist()
   cols.remove('date')
   cols.insert(1, 'date')
   df = df[cols]

   # =====================================================
   # OPTIMIZED STRING PARSING (Vectorized - 10x faster!)
   # =====================================================
   # Convert payLoadData to string once for all operations
   payload_str = df["payLoadData"].astype(str)
   
   # Extract status using vectorized regex (replaces status_split)
   df["status"] = payload_str.str.extract(r'"status"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract connectorId using vectorized regex (replaces connectorid_split)
   connector_match = payload_str.str.extract(r'"connectorId"\s*:\s*(\d+)', expand=False)
   df["connectorId"] = connector_match
   
   # Extract transactionId using vectorized regex (replaces transactionId_split)
   # Try both formats: with and without backslash
   tid_match1 = payload_str.str.extract(r'"transactionId\\*"\s*:\s*(\d+)', expand=False)
   tid_match2 = payload_str.str.extract(r'"transactionId"\s*:\s*(\d+)', expand=False)
   df["transactionId"] = tid_match1.fillna(tid_match2)
   
   # Extract idTag using vectorized regex (replaces idTag_split)
   # Only extract if not idTagInfo
   idtag_match = payload_str.str.extract(r'"idTag"\s*:\s*"([^"]+)"', expand=False)
   # Filter out idTagInfo matches
   has_idtaginfo = payload_str.str.contains('idTagInfo', na=False)
   df["idTag"] = idtag_match.where(~has_idtaginfo, None)
   
   # Extract meterStart using vectorized regex (replaces start_split)
   df["meterStart"] = payload_str.str.extract(r'"meterStart"\s*:\s*(\d+)', expand=False)
   
   # Extract meterStop using vectorized regex (replaces stop_split)
   df["meterStop"] = payload_str.str.extract(r'"meterStop"\s*:\s*(\d+)', expand=False)
   
   # Extract errorCode using vectorized regex (replaces errorCode_split)
   df["errorCode"] = payload_str.str.extract(r'"errorCode"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract info using vectorized regex (replaces info_split)
   df["info"] = payload_str.str.extract(r'"info"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract vendorErrorCode using vectorized regex (replaces vendorErrorCode_split)
   df["vendorErrorCode"] = payload_str.str.extract(r'"vendorErrorCode"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract reason using vectorized regex (replaces reason_split)
   df["reason"] = payload_str.str.extract(r'"reason"\s*:\s*"([^"]+)"', expand=False)
   
   # Extract StopReason using vectorized regex (replaces stopReason_split)
   # Try direct StopReason key first
   stop_reason1 = payload_str.str.extract(r'"StopReason"\s*:\s*"?([^",}]+)"?', expand=False)
   # Try StopReason: format in vendorErrorCode
   stop_reason2 = payload_str.str.extract(r'StopReason:([^",}]+)', expand=False)
   df["StopReason"] = stop_reason1.fillna(stop_reason2).astype(object).str.strip()
   
   # ============================
   # Fill missing connectorId using transactionId mapping
   # ============================
   # Get unique transactionIds (excluding None/NaN)
   unique_transactions = df["transactionId"].dropna().unique()
   
   filled_count = 0
   for tid in unique_transactions:
       # Find rows with this transactionId that have a non-null connectorId
       rows_with_connector = df.loc[
           (df["transactionId"] == tid) & (df["connectorId"].notna())
       ]
       
       # If we found at least one row with connectorId, use it to fill missing ones
       if not rows_with_connector.empty:
           connector_value = rows_with_connector["connectorId"].iloc[0]
           
           # Find rows with this transactionId but missing connectorId
           mask = (df["transactionId"] == tid) & (df["connectorId"].isna())
           
           # Fill the missing connectorId values
           if mask.any():
               df.loc[mask, "connectorId"] = connector_value
               filled_count += mask.sum()
   
   print(f"✅ Filled {filled_count} missing connectorId values using transactionId mapping")




   # ============================
   # Allowed OCPP attributes map
   # ============================
   ALLOWED_ATTRIBUTES = {
       ("Current.Import", "EV"): "Current.Import_EV",
       ("Current.Import", "Outlet"): "Current.Import_Outlet",
       ("Energy.Active.Import.Register", None): "Energy.Active.Import.Register",
       ("Power.Active.Import", None): "Power.Active.Import",
       ("SoC", "EV"): "SoC_EV",
       ("Voltage", "EV"): "Voltage_EV",
       ("Voltage", "Inlet"): "Voltage_Inlet",
       ("Voltage", "Outlet"): "Voltage_Outlet",
       ("Temperature", "Cable"): "Temperature_Cable",
   }

   # =========================================
   # Extract selected MeterValues from JSON
   # =========================================
   def extract_selected_ocpp_metrics(json_text):
       result = {}

       # Skip non-strings
       if not isinstance(json_text, str):
           return result

       # First-level JSON parse
       try:
           payload = json.loads(json_text)
       except Exception:
           return result

       # Handle nested JSON payloads (very common in OCPP logs)
       if isinstance(payload, dict) and "payload" in payload and isinstance(payload["payload"], str):
           try:
               payload = json.loads(payload["payload"])
           except Exception:
               return result

       # Must be dict at this point
       if not isinstance(payload, dict):
           return result

       meter_values = payload.get("meterValue", [])
       if not isinstance(meter_values, list):
           return result

       # Parse MeterValues
       for mv in meter_values:
           sampled_values = mv.get("sampledValue", [])
           if not isinstance(sampled_values, list):
               continue

           for sv in sampled_values:
               measurand = sv.get("measurand")
               location = sv.get("location")
               value = sv.get("value")
               unit = sv.get("unit")

               if value is None:
                   continue

               # Convert value to numeric for processing
               try:
                   numeric_value = float(value)
               except (ValueError, TypeError):
                   numeric_value = value

               # Exact (measurand + location) match
               key = (measurand, location)
               if key in ALLOWED_ATTRIBUTES:
                   attr_name = ALLOWED_ATTRIBUTES[key]
                   # Handle unit conversion for Power.Active.Import
                   if attr_name == "Power.Active.Import" and isinstance(numeric_value, (int, float)):
                       if unit == "kWh":
                           result[attr_name] = numeric_value * 1000
                       elif unit == "Wh":
                           result[attr_name] = numeric_value
                       else:
                           result[attr_name] = value
                   else:
                       result[attr_name] = value
                   continue

               # Measurand-only match (location independent)
               key_no_location = (measurand, None)
               if key_no_location in ALLOWED_ATTRIBUTES:
                   attr_name = ALLOWED_ATTRIBUTES[key_no_location]
                   # Handle unit conversion for Power.Active.Import
                   if attr_name == "Power.Active.Import" and isinstance(numeric_value, (int, float)):
                       if unit == "kWh":
                           result[attr_name] = numeric_value * 1000
                       elif unit == "Wh":
                           result[attr_name] = numeric_value
                       else:
                           result[attr_name] = value
                   else:
                       result[attr_name] = value

       return result

   # =========================================
   # Auto-detect JSON column in DataFrame
   # =========================================
   def find_json_column(df):
       # DEBUG: Print all columns
       print(f"🔍 Searching for JSON column in: {df.columns.tolist()}")
       
       # First pass: Look for columns with meterValue (preferred)
       for col in df.columns:
           print(f"🔍 Checking column: {col}")
           
           # Check first 100 non-null values (increased from 20)
           sample_values = df[col].dropna().head(100)
           
           found_meter_value = False
           for idx, val in enumerate(sample_values):
               if isinstance(val, str):
                   try:
                       parsed = json.loads(val)
                       
                       # Check for meterValue directly
                       if isinstance(parsed, dict) and "meterValue" in parsed:
                           print(f"  ✅ Row {idx}: Found 'meterValue' directly in column '{col}'")
                           found_meter_value = True
                           break
                       
                       # Check for nested payload with meterValue
                       if isinstance(parsed, dict) and "payload" in parsed:
                           payload_val = parsed.get("payload")
                           if isinstance(payload_val, str):
                               try:
                                   nested = json.loads(payload_val)
                                   if isinstance(nested, dict) and "meterValue" in nested:
                                       print(f"  ✅ Row {idx}: Found nested 'meterValue' in column '{col}'")
                                       found_meter_value = True
                                       break
                               except:
                                   pass
                   except Exception as e:
                       # Not JSON, continue
                       pass
           
           if found_meter_value:
               print(f"✅ JSON column with meterValue detected: {col}")
               return col
       
       # Second pass: If no meterValue found, look for any column named 'payLoadData' that contains JSON
       # This handles cases where meterValue entries appear later in the file
       if 'payLoadData' in df.columns:
           col = 'payLoadData'
           sample_values = df[col].dropna().head(20)
           
           for idx, val in enumerate(sample_values):
               if isinstance(val, str):
                   try:
                       parsed = json.loads(val)
                       if isinstance(parsed, dict):
                           print(f"⚠️ No meterValue found in first 100 rows, but 'payLoadData' contains JSON. Using it anyway.")
                           print(f"   Note: MeterValues extraction may yield empty results if file has no MeterValues data.")
                           return col
                   except:
                       pass
       
       # If no column found, print debug info
       print(f"❌ No JSON column with meterValue found")
       print(f"📋 Available columns: {df.columns.tolist()}")
       
       # Sample the first row of each column to help diagnose
       print(f"\n📊 First row sample from each column:")
       for col in df.columns:
           sample = df[col].iloc[0] if len(df) > 0 else None
           if isinstance(sample, str) and len(sample) > 100:
               print(f"  {col}: {sample[:100]}...")
           else:
               print(f"  {col}: {sample}")
       
       return None

   # ============================
   # MAIN EXECUTION
   # ============================


   # 🔹 Find JSON column automatically
   json_column = find_json_column(df)
   if json_column is None:
       raise ValueError("❌ No OCPP MeterValues JSON column found")

   print(f"✅ JSON column detected: {json_column}")

   extracted = df[json_column].apply(extract_selected_ocpp_metrics)
   extracted_df = pd.DataFrame(extracted.tolist())
   
   # FIX: Print what columns were extracted to help debug
   print(f"📊 Extracted MeterValues columns: {extracted_df.columns.tolist()}")
   
   df = pd.concat([df, extracted_df], axis=1)



   tl = [v for v in df['transactionId'].unique() if v is not None]
   dt = {}

   for i in tl:
       x = df.loc[df['transactionId'] == i, 'connectorId'].unique()
       y = x[pd.notna(x)]
       if len(y) > 0:
           dt[i] = y[0]

   def transferConnectId(row):
       if row['connectorId'] is not None:
           return row['connectorId']
       if row['transactionId'] in dt:
           return str(dt[row['transactionId']])

   df['connectorId'] = df.apply(transferConnectId, axis=1)

   l = list(df[(df['command']=="AuthorizeResponse") & (df['status']=="Invalid")]['Id'])
   df = df[~df['Id'].isin(l)]

   l = list(df[(df['command']=="StartTransactionResponse") & (df['status']=="Accepted")]['Id'])
   df["status"] = df.apply(lambda r: 'Accepted' if r['Id'] in l else r['status'], axis=1)

   l = list(df[(df['command']=="RemoteStartTransactionResponse") & (df['status']=="Accepted")]['Id'])
   df["status"] = df.apply(lambda r: 'Accepted' if r['Id'] in l else r['status'], axis=1)

   df["status"] = df.apply(
       lambda r: 'meterStart' if r['command']=="StartTransactionRequest" and r['status']=="Accepted" else r['status'],
       axis=1
   )

   l = list(df[(df['command']=="AuthorizeResponse") & (df['status']=="Accepted")]['Id'])
   df["status"] = df.apply(lambda r: 'Accepted' if r['Id'] in l else r['status'], axis=1)

   df['S.No'] = df.index + 1
   df = df.sort_values(by='S.No', ascending=False)
   df.drop(columns=['S.No'], inplace=True)

   # FIX: Update idtag_update function to use .loc instead of .iloc with get_loc
   def idtag_update(index, connector):
       # Use .loc with row index and column name instead of positional indexing
       df.loc[df.index[index], 'connectorId'] = connector

   for i in range(len(df)):
       x = df.iloc[i]
       if x['command']=="StatusNotificationRequest" and x['status']=="Preparing":
           d={}
           c=x['connectorId']
           while True:
               i+=1
               # Check bounds before accessing
               if i >= len(df):
                   break
               if df.iloc[i]['command']=="AuthorizeRequest" and df.iloc[i]['status']=="Accepted":
                   d[df.iloc[i]['idTag']] = i
               if df.iloc[i]['command']=="StartTransactionRequest" and df.iloc[i]['status']=="meterStart" and df.iloc[i]['connectorId']==c:
                   if df.iloc[i]['idTag'] in d:
                       idtag_update(d[df.iloc[i]['idTag']], c)
                       break
               if df.iloc[i]['status'] in ["Available","Finishing"] and df.iloc[i]['connectorId']==c:
                   break

   # OPTIMIZED: Replace loop with vectorized operation
   # Build transaction ID mapping using boolean indexing
   mask = (df['command'] == "StartTransactionResponse") & (df['status'] == "meterStart")
   tid_mapping = df.loc[mask, ['Id', 'transactionId']].set_index('Id')['transactionId'].to_dict()
   
   # Apply mapping using vectorized map operation (faster than apply)
   df["transactionId"] = df["Id"].map(tid_mapping).fillna(df["transactionId"])

   # OPTIMIZED: Replace loop with boolean indexing
   mask = (df['command'] == "RemoteStopTransactionResponse") & (df['status'] == "Accepted")
   accepted_ids = set(df.loc[mask, 'Id'].tolist())
   
   # Vectorized update using loc
   df.loc[df['Id'].isin(accepted_ids), 'status'] = 'Accepted'

   df = df[~df['command'].isin([
       "RemoteStartTransactionResponse",
       "AuthorizeResponse",
       "RemoteStopTransactionResponse",
       "HeartbeatRequest",
       "HeartbeatResponse"
   ])]

   # OPTIMIZED: Replace apply with vectorized operations using np.select
   # This is 5-10x faster than apply
   df.to_csv('df_before_status_update.csv', index=False)
   
   # Create conditions and choices for np.select
   conditions = [
       (df['command'] == "StartTransactionRequest") & (df['idTag'].astype(str).str.contains('VID', na=False)),
       (df['command'] == "StartTransactionRequest") & (df['idTag'].astype(str).str.len() == 8),
       (df['command'] == "StartTransactionRequest"),
       (df['command'] == "RemoteStopTransactionRequest") & (df['status'] == "Accepted"),
       (df['status'] == "Charging") & (df['info'] == "100%SOC"),
       df['payLoadData'].astype(str).str.contains('meterStop', na=False)
   ]
   
   choices = [
       'Auto-Start',
       'RFID-Start',
       'REMOTE-Start',
       'REMOTE-Stop',
       'FullCharge-Stop',
       'meterStop'
   ]
   
   df["status"] = np.select(conditions, choices, default=df["status"])
   df.to_csv('df_after_status_update.csv', index=False)
   
   # OPTIMIZED: Replace loop with vectorized operation
   mask = df['command'] == "StartTransactionRequest"
   connector_mapping = df.loc[mask, ['Id', 'connectorId']].set_index('Id')['connectorId'].to_dict()
   
   # Vectorized update for StartTransactionResponse
   mask = df['command'] == 'StartTransactionResponse'
   df.loc[mask, 'connectorId'] = df.loc[mask, 'Id'].map(connector_mapping).fillna(df.loc[mask, 'connectorId'])
   df1 = df[df['connectorId'].isin(['1','0'])]
   df2 = df[df['connectorId'].isin(['2','0'])]
   df3 = df[df['connectorId'].isin(['3','0'])]
   df4 = df[df['connectorId'].isin(['4','0'])]
   df5 = df[df['connectorId'].isin(['5','0'])]
   df6 = df[df['connectorId'].isin(['6','0'])]

   # =====================================================
   # 🚀 IDLE TIME ERROR DETECTION
   # =====================================================
   def detect_idle_errors(sf, sessions_df):
       """
       Detect errors that occur outside of charging sessions (idle time).
       Vectorized implementation for O(N) performance.
       
       Parameters:
       - sf: Full DataFrame with all OCPP messages
       - sessions_df: DataFrame with session boundaries (Session_Start, Session_Stop, Error_Window_End)
       
       Returns:
       - List of idle time errors with timestamps
       """
       
       if sf.empty or sessions_df.empty:
           return []
       
       # Reset index for consistent indexing
       sf_reset = sf.reset_index(drop=True)
       
       # Initialize mask: True = Inside a session, False = Idle
       # We start with False (Idle) and mark session ranges as True
       is_in_session = np.zeros(len(sf_reset), dtype=bool)
       
       # Mark all session ranges
       for _, session in sessions_df.iterrows():
           start = int(session['Session_Start'])
           # Use error_window_end to exclude errors within 2-min window after session
           end = int(session['Error_Window_End']) if pd.notna(session.get('Error_Window_End')) else int(session['Session_Stop'])
           
           # Bound checks
           start = max(0, start)
           end = min(len(sf_reset) - 1, end)
           
           if start <= end:
               is_in_session[start : end + 1] = True
       
       # Filter for rows that are NOT in a session (Idle)
       idle_df = sf_reset[~is_in_session].copy()
       
       if idle_df.empty:
           return []

       # List of columns to check for errors
       error_cols = ['errorCode', 'info', 'vendorErrorCode', 'reason', 'StopReason']
       valid_cols = [col for col in error_cols if col in idle_df.columns]
       
       if not valid_cols:
           return []
           
       # Create a mask for rows that have at least one non-empty error value
       # We check if value is NOT in the ignore list
       ignore_values = ["", "None", "nan", "NoError", None]
       
       has_error_mask = pd.Series(False, index=idle_df.index)
       
       for col in valid_cols:
           # Convert to string, strip, and check if not in ignore list
           # We use a vectorized apply approach or direct comparison
           col_series = idle_df[col].astype(str).str.strip()
           mask = ~col_series.isin(ignore_values) & (col_series != 'nan')
           has_error_mask |= mask
           
       # Filter idle_df to stick to rows with actual errors
       error_rows = idle_df[has_error_mask]
       
       idle_errors = []
       
       for idx, row in error_rows.iterrows():
           error_details = {}
           has_error = False
           
           for col in valid_cols:
               val = row[col]
               if pd.notna(val) and str(val).strip() not in ignore_values and str(val) != 'nan':
                   error_details[col] = str(val)
                   has_error = True
           
           if has_error:
               timestamp = row.get('real_datetime')
               idle_error = {
                   'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S') if pd.notna(timestamp) else None,
                   'command': str(row.get('command')) if pd.notna(row.get('command')) else None,
                   'status': str(row.get('status')) if pd.notna(row.get('status')) else None,
               }
               idle_error.update(error_details)
               idle_errors.append(idle_error)

       print(f"📊 Total idle time errors found: {len(idle_errors)}")
       return idle_errors

   # =====================================================
   # 🚀 NEW IMPROVED SESSION CLOSING LOGIC
   # =====================================================
   def report_df(sf):
       """
       Enhanced session detection with accurate stop detection:
       - Uses meterStop as primary stop signal
       - Falls back to Available/Faulted/Finishing status
       - Captures errors within 2-minute window after stop
       - Handles incomplete sessions properly
       - Determines actual start mode from StartTransactionRequest idTag
       - FIX: Preserves transactionId from session data - searches BOTH forward and backward
       - NEW: Stores errors with timestamps
       - FIXED: Uses transactionId-based grouping to prevent duplicate sessions
       """
       
       # Check if DataFrame is empty
       if sf.empty or len(sf) == 0:
           return pd.DataFrame()

       # -----------------------------
       # 1. Find session start points using transactionId-based grouping
       # This prevents intermediate "Preparing" status from creating new sessions
       # -----------------------------
       sf_reset = sf.reset_index(drop=True)
       session_starts = []
       seen_transaction_ids = set()
        
       # First pass: Find all StartTransactionRequest events with valid transactionIds
       if 'command' in sf_reset.columns and 'transactionId' in sf_reset.columns:
           start_tx_requests = sf_reset[
               (sf_reset['command'] == 'StartTransactionRequest') &
               (sf_reset['transactionId'].notna())
           ]
           
           for idx, row in start_tx_requests.iterrows():
               tid = str(row['transactionId'])
               if tid not in seen_transaction_ids and tid != '-1':
                   session_starts.append(idx)
                   seen_transaction_ids.add(tid)
                   print(f"  ✅ Session start at index {idx} with transactionId {tid}")
        
       # Second pass: Add "Preparing" status only for new transactionIds
       preparing_indices = sf_reset.index[sf_reset["status"] == "Preparing"].tolist()
       
       for prep_idx in preparing_indices:
           if 'transactionId' in sf_reset.columns:
               # Look ahead for transactionId in nearby rows (within next 20 rows)
               search_end = min(prep_idx + 20, len(sf_reset))
               nearby_df = sf_reset.iloc[prep_idx:search_end]
               nearby_tids = nearby_df['transactionId'].dropna()
               
               if not nearby_tids.empty:
                   tid = str(nearby_tids.iloc[0])
                   if tid not in seen_transaction_ids and tid != '-1':
                       session_starts.append(prep_idx)
                       seen_transaction_ids.add(tid)
                       print(f"  ✅ Session start at index {prep_idx} (Preparing) with transactionId {tid}")
                   else:
                       print(f"  ⚠️ Skipping Preparing at index {prep_idx} - transactionId {tid} already seen (prevents duplicate session)")
               else:
                   # No transactionId - add if not too close to previous start
                   if not session_starts or (prep_idx - session_starts[-1]) > 5:
                       session_starts.append(prep_idx)
                       print(f"  ⚠️ Session start at index {prep_idx} (Preparing) with no transactionId nearby")
           else:
               session_starts.append(prep_idx)
        
       starts = sorted(session_starts)


       # If no "Preparing" status found, return empty DataFrame
       if len(starts) == 0:
           return pd.DataFrame()

       print(f"🔍 Found {len(starts)} session starts (after transactionId deduplication)")

       # =====================================================================
       # SESSION CLOSING LOGIC - PRIORITY-BASED STOP DETECTION
       # =====================================================================
       # 
       # Priority 1: meterStop with matching transactionId (HIGHEST PRIORITY)
       #   - Searches ENTIRE session range (from session start to next session/EOF)
       #   - Requires BOTH: status='meterStop' AND transactionId match
       #   - Takes precedence over ANY status transitions (Finishing, Available, Faulted)
       #   - Example: Preparing → Charging → Finishing → meterStop
       #            Result: Stops at meterStop (not Finishing) ✅
       #
       # Priority 2: Status Transition (MEDIUM PRIORITY)
       #   - Only triggered if Priority 1 finds nothing
       #   - Looks for first occurrence of: Available, Faulted, or Finishing
       #   - Uses first match found in session range
       #
       # Priority 3: Incomplete (LOW PRIORITY)
       #   - Only triggered if both Priority 1 and 2 find nothing
       #   - Checks last known status in search range
       #   - If status is still "Charging" → marks as "Incomplete"
       #   - Otherwise → marks as "No_Clear_Stop"
       #
       # Error Window Extension (Applied AFTER stop detection):
       #   - After identifying primary stop, opens 2-minute error window
       #   - Captures errors (errorCode, vendorErrorCode) within 2 minutes
       #   - Associates these errors with the closed session
       # =====================================================================
       
       sessions = []
       
       for i, start_idx in enumerate(starts):
           session_info = {
               "Session_Start": start_idx,
               "Session_Stop": None,
               "Stop_Type": None,  # meterStop, Available, Faulted, Finishing, Incomplete
               "Error_Window_End": None,
               "Session_TransactionId": None  # Store session's transactionId for matching
           }
           
           # Determine search boundary (next Preparing or end of file)
           if i + 1 < len(starts):
               search_end = starts[i + 1]
           else:
               search_end = len(sf_reset)
           
           # Search for PRIMARY STOP SIGNALS
           search_df = sf_reset.iloc[start_idx:search_end]
           
           # Extract session's transactionId first (for Priority 1 matching)
           session_transaction_id = None
           if 'transactionId' in search_df.columns:
               # Look for transactionId in StartTransactionRequest or StartTransactionResponse
               start_tx_rows = search_df[
                   search_df['command'].isin(['StartTransactionRequest', 'StartTransactionResponse']) &
                   search_df['transactionId'].notna()
               ]
               if not start_tx_rows.empty:
                   session_transaction_id = str(start_tx_rows['transactionId'].iloc[0])
                   session_info["Session_TransactionId"] = session_transaction_id
               else:
                   # Fallback: any transactionId in the session range
                   tids = search_df['transactionId'].dropna()
                   if not tids.empty:
                       session_transaction_id = str(tids.iloc[0])
                       session_info["Session_TransactionId"] = session_transaction_id
           
           # ============================================================
           # Priority 1: Look for meterStop with matching transactionId
           # IMPORTANT: This searches the ENTIRE session range and takes
           # precedence over ANY status transitions (Finishing, Available, etc.)
           # even if those status transitions appear earlier in the timeline.
           # ============================================================
           primary_stop_idx = None
           if session_transaction_id and 'transactionId' in search_df.columns:
               # STRICT CHECK: Both status='meterStop' AND transactionId match required
               # This will find meterStop even if it appears AFTER Finishing/Available/Faulted
               meter_stop_matches = search_df[
                   (search_df['status'] == 'meterStop') &
                   (search_df['transactionId'].astype(str) == session_transaction_id)
               ]
               
               if not meter_stop_matches.empty:
                   primary_stop_idx = meter_stop_matches.index[0]
                   session_info["Stop_Type"] = "meterStop"
           
           # ============================================================
           # Priority 2: Look for status changes (Available, Faulted, Finishing)
           # Only used if Priority 1 did NOT find meterStop with matching transactionId
           # ============================================================
           if primary_stop_idx is None:
               status_stop_idx = search_df[
                   search_df['status'].isin(['Available', 'Faulted', 'Finishing'])
               ].index
               
               if len(status_stop_idx) > 0:
                   primary_stop_idx = status_stop_idx[0]
                   stop_status = sf_reset.loc[primary_stop_idx, 'status']
                   session_info["Stop_Type"] = stop_status
           
           # Priority 3: Incomplete or No Clear Stop
           if primary_stop_idx is None:
               # No clear stop found - check if still charging
               last_idx = search_end - 1
               last_status = sf_reset.loc[last_idx, 'status'] if last_idx < len(sf_reset) else None
               
               if last_status == "Charging":
                   session_info["Stop_Type"] = "Incomplete"
                   primary_stop_idx = last_idx
               else:
                   # Use last event before next session
                   primary_stop_idx = search_end - 1
                   session_info["Stop_Type"] = "No_Clear_Stop"
           
           session_info["Session_Stop"] = primary_stop_idx
           
           # -----------------------------
           # 3. Open 2-MINUTE ERROR WINDOW after primary stop
           # -----------------------------
           if 'real_datetime' in sf_reset.columns:
               stop_time = sf_reset.loc[primary_stop_idx, 'real_datetime']
               
               if pd.notna(stop_time):
                   # Define 2-minute window
                   error_window_end_time = stop_time + timedelta(minutes=2)
                   
                   # Find events within error window
                   remaining_df = sf_reset.iloc[primary_stop_idx:search_end]
                   window_events = remaining_df[
                       remaining_df['real_datetime'] <= error_window_end_time
                   ]
                   
                   if len(window_events) > 0:
                       error_window_end_idx = window_events.index[-1]
                       session_info["Error_Window_End"] = error_window_end_idx
                   else:
                       session_info["Error_Window_End"] = primary_stop_idx
               else:
                   session_info["Error_Window_End"] = primary_stop_idx
           else:
               session_info["Error_Window_End"] = primary_stop_idx
           
           sessions.append(session_info)

       # -----------------------------
       # 4. Extract session data
       # -----------------------------
       status_cols = {
           "is_Preparing": "Preparing",
           "is_Auto_Start": "Auto-Start",
           "is_REMOTE_Start": "REMOTE-Start",
           "is_RFID_Start": "RFID-Start",
           "is_Charging": "Charging",
       }

       single_value_cols = ["errorCode", "info", "vendorErrorCode", "reason", "StopReason"]

       max_value_cols = {
           "Power.Active.Import": "Power.Active.Import",
           "SoC_EV": "SoC_EV",
       }

       # Initialize DataFrame
       xf = pd.DataFrame(sessions)
       
       for col in status_cols:
           xf[col] = 0

       for col in single_value_cols:
           xf[col] = None

       for col in max_value_cols:
           xf[col] = None

       xf["transactionId"] = None
       xf["session_start_time"] = None
       xf["session_end_time"] = None
       
       # NEW: Additional session metrics
       xf["all_errors"] = None  # List of all errors with timestamps
       xf["session_duration_minutes"] = None
       xf["session_energy_delivered_kwh"] = None
       xf["session_peak_power_kw"] = None
       
       # NEW: Add cp_id and connector_id
       xf["cp_id"] = None
       xf["connector_id"] = None

       # -----------------------------
       # 5. Extract session details
       # -----------------------------
       for i in range(len(xf)):
           start = int(xf.loc[i, "Session_Start"])
           stop = int(xf.loc[i, "Session_Stop"])
           error_window_end = int(xf.loc[i, "Error_Window_End"]) if pd.notna(xf.loc[i, "Error_Window_End"]) else stop

           # Main session data (start to primary stop)
           # NOTE: stop + 1 ensures the stop event itself is INCLUDED
           # This captures reason, StopReason, and other fields from meterStop/Finishing/etc.
           session_df = sf_reset.iloc[start:stop + 1]
           
           # Error window data (primary stop to error window end)
           # NOTE: Starts from stop (not stop+1) to include the stop event in error window
           error_window_df = sf_reset.iloc[stop:error_window_end + 1]
           
           # FULL SESSION DATA (for metrics calculation)
           # NOTE: Includes everything from session start through error window
           full_session_df = sf_reset.iloc[start:error_window_end + 1]

           # Skip if session_df is empty
           if session_df.empty:
               continue

           # Extract cp_id and connector_id
           if 'cp_id' in session_df.columns:
               cp_ids = session_df['cp_id'].dropna()
               if not cp_ids.empty:
                   xf.loc[i, "cp_id"] = str(cp_ids.iloc[0])
           
           if 'connectorId' in session_df.columns:
               connector_ids = session_df['connectorId'].dropna()
               if not connector_ids.empty:
                   xf.loc[i, "connector_id"] = str(connector_ids.iloc[0])

           # Extract session start and end times
           session_start_dt = None
           session_end_dt = None
           
           if 'real_datetime' in session_df.columns:
               start_times = session_df['real_datetime'].dropna()
               if not start_times.empty:
                   session_start_dt = start_times.iloc[0]
                   xf.loc[i, "session_start_time"] = session_start_dt.strftime('%Y-%m-%d %H:%M:%S')
               
               # Use error window end time for session end
               end_times = error_window_df['real_datetime'].dropna()
               if not end_times.empty:
                   session_end_dt = end_times.iloc[-1]
                   xf.loc[i, "session_end_time"] = session_end_dt.strftime('%Y-%m-%d %H:%M:%S')
               
               # Calculate session duration
               if session_start_dt and session_end_dt:
                   duration = session_end_dt - session_start_dt
                   xf.loc[i, "session_duration_minutes"] = round(duration.total_seconds() / 60, 2)

           # Status flags - UPDATED LOGIC for start modes
           statuses = session_df["status"].dropna().unique()
           
           # First, mark all statuses
           for out_col, status_name in status_cols.items():
               xf.loc[i, out_col] = int(status_name in statuses)
           
           # NEW: Determine actual start mode from StartTransactionRequest idTag
           # This overrides the initial status flags for start modes
           start_tx_rows = session_df[session_df["command"] == "StartTransactionRequest"]
           if not start_tx_rows.empty and "idTag" in start_tx_rows.columns:
               # Get the idTag from StartTransactionRequest
               start_id_tag = start_tx_rows["idTag"].dropna()
               if not start_id_tag.empty:
                   actual_id_tag = str(start_id_tag.iloc[0])
                   
                   # Reset all start mode flags to 0
                   xf.loc[i, "is_Auto_Start"] = 0
                   xf.loc[i, "is_REMOTE_Start"] = 0
                   xf.loc[i, "is_RFID_Start"] = 0
                   
                   # Set the correct start mode based on idTag
                   if "VID" in actual_id_tag:
                       xf.loc[i, "is_Auto_Start"] = 1
                   elif len(actual_id_tag) == 8:
                       xf.loc[i, "is_RFID_Start"] = 1
                   else:
                       # Default to REMOTE-Start for all other cases
                       xf.loc[i, "is_REMOTE_Start"] = 1

           # ========================================
           # FIX: IMPROVED transactionId EXTRACTION with SMART FILTERING
           # Strategy:
           # 1. Look for StartTransactionRequest/Response in forward direction (CMS data)
           # 2. If not found, look backward but ONLY for matching connector (S3 data)
           # 3. Filter by command type to avoid picking up wrong transactions
           # 4. Exclude transactionIds already assigned to previous sessions
           # 5. If still not found, expand search range significantly
           # ========================================
           
           # Get current session's connector ID
           session_connector_id = None
           if 'connectorId' in session_df.columns:
               connector_ids = session_df['connectorId'].dropna()
               if not connector_ids.empty:
                   session_connector_id = str(connector_ids.iloc[0])
           
           # NEW: Get list of transactionIds already assigned to previous sessions
           already_assigned_tids = set()
           if i > 0:
               already_assigned_tids = set(xf.loc[:i-1, 'transactionId'].dropna().astype(str))
           
           # Calculate BACKWARD search boundary (limited to avoid picking old sessions)
           # Only go back maximum 200 rows or to previous session
           if i > 0:
               backward_search_start = max(starts[i - 1], start - 200)
           else:
               backward_search_start = max(0, start - 200)
           
           # Calculate FORWARD search boundary (until next session or end of file)
           if i + 1 < len(starts):
               forward_search_end = starts[i + 1]
           else:
               forward_search_end = len(sf_reset)
           
           transaction_id_found = None
           
           if "transactionId" in sf_reset.columns:
               # ============================================
               # PRIORITY 1: FORWARD SEARCH (CMS data pattern)
               # Look for StartTransactionResponse or any row with transactionId
               # ============================================
               forward_range = sf_reset.iloc[start:forward_search_end]
               
               # First try: Look for StartTransactionRequest with matching connector
               if 'command' in forward_range.columns:
                   start_tx_requests = forward_range[
                       (forward_range['command'] == 'StartTransactionRequest') &
                       (forward_range['transactionId'].notna())
                   ]
                   
                   if not start_tx_requests.empty:
                       # If we have connector ID, filter by it
                       if session_connector_id:
                           start_tx_requests = start_tx_requests[
                               start_tx_requests['connectorId'].astype(str) == session_connector_id
                           ]
                       
                       # NEW: Exclude already assigned transactionIds
                       if already_assigned_tids:
                           start_tx_requests = start_tx_requests[
                               ~start_tx_requests['transactionId'].astype(str).isin(already_assigned_tids)
                           ]
                       
                       if not start_tx_requests.empty:
                           transaction_id_found = start_tx_requests['transactionId'].iloc[0]
               
               # Second try: Look for StartTransactionResponse
               if not transaction_id_found and 'command' in forward_range.columns:
                   start_tx_responses = forward_range[
                       (forward_range['command'] == 'StartTransactionResponse') &
                       (forward_range['transactionId'].notna())
                   ]
                   
                   # NEW: Exclude already assigned transactionIds
                   if already_assigned_tids:
                       start_tx_responses = start_tx_responses[
                           ~start_tx_responses['transactionId'].astype(str).isin(already_assigned_tids)
                       ]
                   
                   if not start_tx_responses.empty:
                       transaction_id_found = start_tx_responses['transactionId'].iloc[0]
               
               # Third try: Look for StopTransactionRequest (reliable source)
               if not transaction_id_found and 'command' in forward_range.columns:
                   stop_tx_requests = forward_range[
                       (forward_range['command'] == 'StopTransactionRequest') &
                       (forward_range['transactionId'].notna())
                   ]
                   
                   # NEW: Exclude already assigned transactionIds
                   if already_assigned_tids:
                       stop_tx_requests = stop_tx_requests[
                           ~stop_tx_requests['transactionId'].astype(str).isin(already_assigned_tids)
                       ]
                   
                   if not stop_tx_requests.empty:
                       transaction_id_found = stop_tx_requests['transactionId'].iloc[0]
               
               # Fourth try: Any row with transactionId in forward range
               if not transaction_id_found:
                   forward_tids = forward_range['transactionId'].dropna()
                   
                   # NEW: Exclude already assigned transactionIds
                   if already_assigned_tids:
                       forward_tids = forward_tids[~forward_tids.astype(str).isin(already_assigned_tids)]
                   
                   if not forward_tids.empty:
                       transaction_id_found = forward_tids.iloc[0]
               
               # ============================================
               # PRIORITY 2: BACKWARD SEARCH (S3 reversed data pattern)
               # Only if forward search failed
               # ============================================
               if not transaction_id_found:
                   backward_range = sf_reset.iloc[backward_search_start:start]
                   
                   # First try: Look for StartTransactionResponse with matching connector (most reliable for S3)
                   if 'command' in backward_range.columns:
                       start_tx_responses = backward_range[
                           (backward_range['command'] == 'StartTransactionResponse') &
                           (backward_range['transactionId'].notna())
                       ]
                       
                       # NEW: Exclude already assigned transactionIds FIRST
                       if already_assigned_tids:
                           start_tx_responses = start_tx_responses[
                               ~start_tx_responses['transactionId'].astype(str).isin(already_assigned_tids)
                           ]
                       
                       # Filter by connector if we have it
                       if not start_tx_responses.empty and session_connector_id:
                           # Check if connectorId matches
                           matching_responses = start_tx_responses[
                               start_tx_responses['connectorId'].astype(str) == session_connector_id
                           ]
                           
                           if not matching_responses.empty:
                               # Take the LAST one (closest to session start)
                               transaction_id_found = matching_responses['transactionId'].iloc[-1]
                           elif not start_tx_responses.empty:
                               # No connector match, take the last one anyway
                               transaction_id_found = start_tx_responses['transactionId'].iloc[-1]
                   
                   # Second try: Look for StartTransactionRequest in backward range
                   if not transaction_id_found and 'command' in backward_range.columns:
                       start_tx_requests = backward_range[
                           (backward_range['command'] == 'StartTransactionRequest') &
                           (backward_range['transactionId'].notna())
                       ]
                       
                       # NEW: Exclude already assigned transactionIds
                       if already_assigned_tids:
                           start_tx_requests = start_tx_requests[
                               ~start_tx_requests['transactionId'].astype(str).isin(already_assigned_tids)
                           ]
                       
                       # Filter by connector
                       if not start_tx_requests.empty and session_connector_id:
                           matching_requests = start_tx_requests[
                               start_tx_requests['connectorId'].astype(str) == session_connector_id
                           ]
                           
                           if not matching_requests.empty:
                               transaction_id_found = matching_requests['transactionId'].iloc[-1]
                   
                   # Third try: Filter backward search by avoiding old completed transactions
                   if not transaction_id_found:
                       # Get all transactionIds in backward range
                       backward_tids = backward_range['transactionId'].dropna()
                       
                       # NEW: Exclude already assigned transactionIds
                       if already_assigned_tids:
                           backward_tids = backward_tids[~backward_tids.astype(str).isin(already_assigned_tids)]
                       
                       if not backward_tids.empty:
                           # Check if there's a StopTransaction with this transactionId (means it's already finished)
                           if 'command' in backward_range.columns:
                               # Get the last transactionId
                               candidate_tid = backward_tids.iloc[-1]
                               
                               # Check if this transaction was already stopped
                               stop_tx = backward_range[
                                   (backward_range['command'].isin(['StopTransactionRequest', 'StopTransactionResponse'])) &
                                   (backward_range['transactionId'].astype(str) == str(candidate_tid))
                               ]
                               
                               if stop_tx.empty:
                                   # Transaction not stopped yet, probably belongs to this session
                                   transaction_id_found = candidate_tid
               
               # ============================================
               # PRIORITY 3: EXPANDED SEARCH (for edge cases)
               # If still not found and session is charging, expand search significantly
               # ============================================
               if not transaction_id_found and xf.loc[i, "is_Charging"] == 1:
                   # Expand backward search to cover more ground (up to 500 rows or start of file)
                   expanded_backward_start = max(0, start - 500)
                   expanded_backward_range = sf_reset.iloc[expanded_backward_start:start]
                   
                   # Look for ANY transactionId in expanded range with connector match
                   if 'command' in expanded_backward_range.columns and session_connector_id:
                       all_tx_in_range = expanded_backward_range[
                           expanded_backward_range['transactionId'].notna()
                       ]
                       
                       # Exclude already assigned
                       if already_assigned_tids:
                           all_tx_in_range = all_tx_in_range[
                               ~all_tx_in_range['transactionId'].astype(str).isin(already_assigned_tids)
                           ]
                       
                       # Filter by connector
                       connector_match = all_tx_in_range[
                           all_tx_in_range['connectorId'].astype(str) == session_connector_id
                       ]
                       
                       if not connector_match.empty:
                           # Take the last one (closest to session)
                           transaction_id_found = connector_match['transactionId'].iloc[-1]
               
               if transaction_id_found:
                   xf.loc[i, "transactionId"] = transaction_id_found

           # ========================================
           # NEW: CAPTURE ALL ERRORS WITH TIMESTAMPS (ROW-BY-ROW)
           # ========================================
           all_errors = []
           
           # Collect from full session (including error window) row by row
           for idx in full_session_df.index:
               row = full_session_df.loc[idx]
               
               # Extract all error-related fields for this row
               error_code = row.get('errorCode', None)
               info = row.get('info', None)
               vendor_error = row.get('vendorErrorCode', None)
               reason = row.get('reason', None)
               stop_reason = row.get('StopReason', None)
               timestamp = row.get('real_datetime', None)
               
               # Check if this row has any error information
               has_error = False
               for val in [error_code, info, vendor_error, reason, stop_reason]:
                   if pd.notna(val) and str(val).strip() not in ["", "None", "nan", "NoError"]:
                       has_error = True
                       break
               
               # If row has error info, add as dict with timestamp
               if has_error:
                   error_dict = {}
                   
                   # Add timestamp first
                   if pd.notna(timestamp):
                       error_dict['timestamp'] = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                   else:
                       error_dict['timestamp'] = None
                   
                   # Add error fields only if they have values
                   if pd.notna(error_code) and str(error_code).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['errorCode'] = str(error_code)
                   
                   if pd.notna(info) and str(info).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['info'] = str(info)
                   
                   if pd.notna(vendor_error) and str(vendor_error).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['vendorErrorCode'] = str(vendor_error)
                   
                   if pd.notna(reason) and str(reason).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['reason'] = str(reason)
                   
                   if pd.notna(stop_reason) and str(stop_reason).strip() not in ["", "None", "nan", "NoError"]:
                       error_dict['StopReason'] = str(stop_reason)
                   
                   # Only add if we have more than just timestamp
                   if len(error_dict) > 1:
                       all_errors.append(error_dict)
           
           # Store errors as list
           xf.at[i, "all_errors"] = all_errors if all_errors else None

           # ========================================
           # NEW: CALCULATE ENERGY DELIVERED
           # ========================================
           # Look for meterStart and meterStop first
           meter_start = None
           meter_stop = None
           
           if "meterStart" in session_df.columns:
               ms = pd.to_numeric(session_df["meterStart"], errors="coerce").dropna()
               if not ms.empty:
                   meter_start = ms.iloc[0]
           
           if "meterStop" in full_session_df.columns:
               # Look for meterStop in full session
               ms = pd.to_numeric(full_session_df["meterStop"], errors="coerce").dropna()
               if not ms.empty:
                   meter_stop = ms.iloc[-1]  # Take last meterStop
           
           # If no meterStop, use last Energy.Active.Import.Register value
           if meter_stop is None and "Energy.Active.Import.Register" in full_session_df.columns:
               energy_vals = pd.to_numeric(
                   full_session_df["Energy.Active.Import.Register"], 
                   errors="coerce"
               ).dropna()
               if not energy_vals.empty:
                   meter_stop = energy_vals.iloc[-1]
           
           # Calculate energy delivered
           if meter_start is not None and meter_stop is not None:
               energy_wh = meter_stop - meter_start
               energy_kwh = energy_wh / 1000  # Convert Wh to kWh
               xf.loc[i, "session_energy_delivered_kwh"] = round(energy_kwh, 3)

           # ========================================
           # NEW: CALCULATE PEAK POWER IN SESSION
           # ========================================
           if "Power.Active.Import" in full_session_df.columns:
               power_vals = pd.to_numeric(
                   full_session_df["Power.Active.Import"], 
                   errors="coerce"
               ).dropna()
               if not power_vals.empty:
                   peak_power_w = power_vals.max()
                   peak_power_kw = peak_power_w / 1000
                   xf.loc[i, "session_peak_power_kw"] = round(peak_power_kw, 2)

           # Single-value fields - KEEP ORIGINAL LOGIC for backward compatibility
           # But prioritize error window data
           for col in single_value_cols:
               # First check error window for this field
               if col in error_window_df.columns:
                   window_val = error_window_df[col].dropna()
                   if not window_val.empty:
                       xf.loc[i, col] = window_val.iloc[-1]  # Use last value in error window
                       continue
               
               # Fallback to session data
               if col in session_df.columns:
                   val = session_df[col].dropna()
                   xf.loc[i, col] = val.iloc[-1] if not val.empty else None

           # Max numeric fields (keep original for SoC)
           for out_col, src_col in max_value_cols.items():
               if src_col in session_df.columns:
                   xf.loc[i, out_col] = pd.to_numeric(
                       session_df[src_col], errors="coerce"
                   ).max()

       # -----------------------------
       # 6. Create session-level DataFrame
       # -----------------------------
       df_session_cols = [
           "Session_Start",
           "Session_Stop",
           "Stop_Type",
           "Error_Window_End",
           "is_Preparing",
           "is_Auto_Start",
           "is_REMOTE_Start",
           "is_RFID_Start",
           "is_Charging",
           "transactionId",
           "session_start_time",
           "session_end_time",
           "session_duration_minutes",
           "session_energy_delivered_kwh",
           "session_peak_power_kw",
           "all_errors",
           "cp_id",
           "connector_id"
       ]

       df_session = xf[df_session_cols].copy()

       # -----------------------------
       # 7. Transaction-level DataFrame
       # -----------------------------
       agg_dict = {}
       if "errorCode" in xf.columns:
           agg_dict["errorCode"] = "first"
       if "info" in xf.columns:
           agg_dict["info"] = "first"
       if "vendorErrorCode" in xf.columns:
           agg_dict["vendorErrorCode"] = "first"
       if "reason" in xf.columns:
           agg_dict["reason"] = "first"
       if "StopReason" in xf.columns:
           agg_dict["StopReason"] = "first"
       if "Power.Active.Import" in xf.columns:
           agg_dict["Power.Active.Import"] = "max"
       if "SoC_EV" in xf.columns:
           agg_dict["SoC_EV"] = "max"
       
       if agg_dict:
           df_transaction = (
               xf.groupby("transactionId", dropna=True, as_index=False)
                   .agg(agg_dict)
           )
       else:
           df_transaction = pd.DataFrame(columns=["transactionId"])

       # -----------------------------
       # 8. Merge session + transaction
       # -----------------------------
       final_df = df_session.merge(
           df_transaction,
           on="transactionId",
           how="left"
       )

       return final_df
   
   # Process all connectors (up to 6)
   dfs = {1: df1, 2: df2, 3: df3, 4: df4, 5: df5, 6: df6}
   processed = {c: report_df(dfs[c]) for c in range(1, 7)}
   x, y = processed[1], processed[2]
   
   # =====================================================
   # 🔔 DETECT IDLE TIME ERRORS (before dropping session boundaries)
   # =====================================================
   idle_errors = {c: [] for c in range(1, 7)}

   for c in range(1, 7):
       if not processed[c].empty and all(col in processed[c].columns for col in ['Session_Start', 'Session_Stop', 'Error_Window_End']):
           print(f"\n🔍 Detecting idle time errors for Connector {c}...")
           idle_errors[c] = detect_idle_errors(dfs[c], processed[c])

   idle_errors_c1, idle_errors_c2 = idle_errors[1], idle_errors[2]

   # Drop internal processing columns before returning to user
   cols_to_drop = ['Session_Start', 'Session_Stop', 'Error_Window_End']

   for c in range(1, 7):
       if not processed[c].empty:
           existing_cols = [col for col in cols_to_drop if col in processed[c].columns]
           if existing_cols:
               processed[c] = processed[c].drop(columns=existing_cols)

   x, y = processed[1], processed[2]

   # =====================================================
   # 🔥 ENHANCED SESSION CLASSIFICATION LOGIC - PRIORITY-BASED
   # =====================================================
   def set_stop(row):
       try:
           # Get Stop_Type (from session closing logic)
           stop_type = row.get("Stop_Type", None)
           
           # ============================================================
           # PRIORITY 3: Incomplete sessions (check first for early exit)
           # ============================================================
           if stop_type == "Incomplete":
               return "Incomplete"
           
           # Pre-charging failure (never reached Charging status)
           if row.get("is_Charging", 0) == 0:
               return None  # Precharging Failure
           
           # SoC Override: If 99% or 100%, always successful
           soc = pd.to_numeric(row.get("SoC_EV", None), errors="coerce")
           if pd.notna(soc) and soc >= 99.0:
               return "Successful"

           # ============================================================
           # NEW: Determine Effective Reason
           # "check for reason if reason is null go for StopReason"
           # ============================================================
           reason = row.get("reason", None)
           stop_reason = row.get("StopReason", None)
           
           primary_reason = reason if (pd.notna(reason) and str(reason).strip() not in ["", "None", "nan"]) else stop_reason
           
           # Evaluate Primary Reason
           if pd.notna(primary_reason) and str(primary_reason).strip() not in ["", "None", "nan"]:
               primary_reason_str = str(primary_reason).strip()
               
               # Rule: "make Reboot and PowerLoss as Successful allways"
               # CASE-INSENSITIVE CHECK
               if primary_reason_str.lower() in ["reboot", "powerloss"]:
                   return "Successful"
               
               # Successful reasons
               if primary_reason_str in ["Local", "Remote", "UserRequestedStop", "NoError", "Reason:NoError"]:
                   return "Successful"
               
               # Known Failure reasons
               return "Failed / Error"

           # ============================================================
           # Fallback Logic (if no primary reason found)
           # ============================================================
           
           has_real_errors = False
           all_errors = row.get("all_errors", None)
           if all_errors and isinstance(all_errors, list):
               for error_dict in all_errors:
                   if isinstance(error_dict, dict):
                       for key, val in error_dict.items():
                           if key != "timestamp" and val:
                               val_str = str(val)
                               
                               # Check against successful patterns
                               # Special handling for Reboot/PowerLoss (case-insensitive)
                               if val_str.lower() in ["reboot", "powerloss"]:
                                   continue

                               successful_patterns = [
                                   "NoError", "Local", "Remote", "UserRequestedStop", "None", 
                                   "StopReason:NoError", "StopReason:Local", "StopReason:Remote", 
                                   "StopReason:UserRequestedStop"
                               ]
                               
                               if val_str not in successful_patterns:
                                   has_real_errors = True
                                   break
                   if has_real_errors:
                       break

           # If Stop_Type is Faulted and we have not found a successful reason -> Failed
           if stop_type == "Faulted":
               return "Failed / Error"
           
           # If we have real errors -> Failed
           if has_real_errors:
               return "Failed / Error"
           
           # Default to Successful if no errors and no failure reason
           return "Successful"
           
       except Exception as e:
           print(f"Error in set_stop: {e}, row: {row.to_dict()}")
           return "Failed / Error"

   # Apply stop classification
   for c in range(1, 7):
       if not processed[c].empty:
           processed[c]["stop"] = processed[c].apply(set_stop, axis=1)
   x, y = processed[1], processed[2]

   def set_vendorErrorCode(row):
       """
       Extract primary error for display.
       Now we have all_errors list, but keep vendorErrorCode as primary error for compatibility
       """
       try:
           # Pre-charging failure
           if row['is_Charging'] == 0:
               return "Precharging Failure"
           
           # NEW: If we have all_errors list, use first significant error
           all_errors = row.get('all_errors', None)
           if all_errors and isinstance(all_errors, list) and len(all_errors) > 0:
               # Return first error dict's first non-timestamp value
               first_error = all_errors[0]
               if isinstance(first_error, dict):
                   for key, val in first_error.items():
                       if key != 'timestamp' and val:
                           return val
           
           # FALLBACK: Original logic
           info = row.get('info', None)
           vendor_error = row.get('vendorErrorCode', None)
           reason = row.get('reason', None)
           stop_reason = row.get('StopReason', None)
           
           # Priority 1: info field (most descriptive)
           if pd.notna(info) and info != '':
               return info
           
           # Priority 2: vendorErrorCode field
           if pd.notna(vendor_error) and vendor_error != '':
               return vendor_error
           
           # Priority 3: StopReason
           if pd.notna(stop_reason) and stop_reason not in ["NoError"]:
               return stop_reason
           
           # Priority 4: Check EVDisconnected with low SoC
           if reason == "EVDisconnected":
               soc = pd.to_numeric(row.get('SoC_EV', None), errors='coerce')
               if pd.notna(soc) and soc < 99.0:
                   return "EVDisconnected"
           
           return None
           
       except Exception as e:
           print(f"Error in set_vendorErrorCode: {e}, row: {row.to_dict()}")
           return None
   
   # Apply error code extraction
   for c in range(1, 7):
       if not processed[c].empty:
           processed[c]["vendorErrorCode"] = processed[c].apply(set_vendorErrorCode, axis=1)

   # Convert to JSON and build summaries for all connectors
   connector_json = {c: processed[c].to_json(orient='records', indent=4) for c in range(1, 7)}
   reports = {c: json_safe(build_summary(processed[c], idle_errors[c])) for c in range(1, 7)}

   # Get CP details
   cp_id = None
   if 'cp_id' in df.columns and len(df) > 0:
       cp_id = str(df['cp_id'].iloc[0])
       print(f"CP ID: {cp_id}")

   info_data = "[]"
   if cp_id:
       try:
           cp_info = cp_details(cp_id)
           info_data = cp_info.to_json(orient='records', indent=4)
       except Exception as e:
           print(f"Error getting CP details: {e}")
           info_data = "[]"

   # Get date details
   date_info = {}
   if 'date' in df.columns and len(df) > 0:
       date_info = date_details(df['date'])

   result = {"info": info_data, "date": date_info}
   for c in range(1, 7):
       result[f"Connector{c}"] = connector_json[c]
       result[f"report_{c}"] = reports[c]
   return result
